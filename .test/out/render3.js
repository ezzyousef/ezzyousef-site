import { renderToString } from "react-dom/server";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/lib/api.js
async function request(path, options = {}) {
	const res = await fetch(path, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers || {}
		}
	});
	let body = null;
	try {
		body = await res.json();
	} catch {}
	if (!res.ok) throw new Error(body && body.error || `Request failed (${res.status})`);
	return body;
}
var api = {
	getContent: () => request("/api/content"),
	login: (password) => request("/api/auth", {
		method: "POST",
		body: JSON.stringify({ password })
	}),
	saveContent: (token, content) => request("/api/content", {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: JSON.stringify({ content })
	}),
	upload: (token, file) => new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Could not read that file."));
		reader.onload = () => {
			const data = String(reader.result).split(",")[1];
			request("/api/upload", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					name: file.name,
					type: file.type,
					data
				})
			}).then(resolve, reject);
		};
		reader.readAsDataURL(file);
	})
};
//#endregion
//#region src/theme.js
/** Font choices offered in the dashboard. Each is loaded from Google Fonts. */
var FONTS = {
	display: [
		"Newsreader",
		"Spectral",
		"Source Serif 4",
		"Fraunces",
		"Libre Baskerville",
		"Playfair Display",
		"Archivo"
	],
	body: [
		"Archivo",
		"Public Sans",
		"Work Sans",
		"Source Sans 3",
		"Karla",
		"Figtree"
	],
	mono: [
		"IBM Plex Mono",
		"JetBrains Mono",
		"Space Mono",
		"Roboto Mono"
	]
};
//#endregion
//#region src/admin/panel-css.js
var PANEL_CSS = `
.ad-shell, .ad-login-wrap, .ad-float {
  --ad-bg: #0E1418;
  --ad-panel: #161F25;
  --ad-line: #26333B;
  --ad-text: #E8F0F4;
  --ad-dim: #93A6B1;
  --ad-accent: var(--accent, #4FC7E8);
  --ad-ok: #46B67F;
  --ad-bad: #E0685F;
  font-family: var(--body), system-ui, sans-serif;
  color: var(--ad-text);
}

.ad-shell {
  position: fixed; inset: 0; z-index: 9000;
  display: grid; grid-template-columns: 216px minmax(0, 1fr);
  background: var(--ad-bg);
}

@media (max-width: 760px) { .ad-shell { grid-template-columns: 1fr; grid-template-rows: auto minmax(0,1fr); } }

.ad-side { border-right: 1px solid var(--ad-line); display: flex; flex-direction: column;
  padding: 16px 12px calc(14px + env(safe-area-inset-bottom, 0px)); gap: 14px; overflow-y: auto; }
@media (max-width: 760px) { .ad-side { border-right: 0; border-bottom: 1px solid var(--ad-line); } }

.ad-brand { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--ad-dim); padding: 4px 10px; }

.ad-nav { display: flex; flex-direction: column; gap: 2px; }
@media (max-width: 760px) { .ad-nav { flex-direction: row; overflow-x: auto; } }

.ad-nav button {
  text-align: left; background: transparent; border: 0; color: var(--ad-dim);
  padding: 9px 11px; border-radius: 7px; font-size: 14px; cursor: pointer; white-space: nowrap;
}
.ad-nav button:hover { color: var(--ad-text); background: rgba(255,255,255,.04); }
.ad-nav button.on { color: #061318; background: var(--ad-accent); font-weight: 600; }

.ad-side-foot { margin-top: auto; display: flex; flex-direction: column; gap: 7px; }
@media (max-width: 760px) { .ad-side-foot { flex-direction: row; margin-top: 0; } }

.ad-main { display: flex; flex-direction: column; min-height: 0; }

.ad-top {
  display: flex; align-items: center; gap: 14px; padding: 14px 22px;
  border-bottom: 1px solid var(--ad-line); background: var(--ad-panel);
  padding-top: calc(14px + env(safe-area-inset-top, 0px));
}
.ad-top h1 { font-size: 17px; margin: 0; margin-right: auto; font-weight: 600; }
.ad-state { font-size: 12px; color: var(--ad-dim); white-space: nowrap; }
.ad-state.dirty { color: var(--ad-accent); }

.ad-body { overflow-y: auto; padding: 22px; display: flex; flex-direction: column; gap: 20px;
  padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)); }

.ad-help { font-size: 14px; color: var(--ad-dim); margin: 0; max-width: 70ch; line-height: 1.55; }

.ad-note { padding: 10px 14px; border-radius: 7px; font-size: 14px; margin: 0 22px; }
.ad-note.ok { background: rgba(70,182,127,.14); color: var(--ad-ok); }
.ad-note.bad { background: rgba(224,104,95,.14); color: var(--ad-bad); }

.ad-field { display: flex; flex-direction: column; gap: 6px; }
.ad-label { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--ad-dim); }
.ad-label em { font-style: normal; text-transform: none; letter-spacing: 0; opacity: .7; margin-left: 7px; }

.ad-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }

.ad-input {
  width: 100%; background: #0B1114; color: var(--ad-text);
  border: 1px solid var(--ad-line); border-radius: 7px; padding: 9px 11px;
  font: inherit; font-size: 14px;
}
.ad-input:focus { outline: 2px solid var(--ad-accent); outline-offset: 1px; border-color: transparent; }
.ad-area { resize: vertical; line-height: 1.5; }
select.ad-input { appearance: none; }

.ad-num { display: flex; align-items: center; gap: 8px; }
.ad-num em { font-style: normal; font-size: 12px; color: var(--ad-dim); }

.ad-colour { display: flex; align-items: center; gap: 9px; }
.ad-colour input[type=color] { width: 42px; height: 38px; padding: 0; border: 1px solid var(--ad-line);
  border-radius: 7px; background: transparent; cursor: pointer; flex: none; }

.ad-check { display: flex; align-items: center; gap: 9px; font-size: 14px; color: var(--ad-dim); cursor: pointer; }
.ad-check input { width: 16px; height: 16px; accent-color: var(--ad-accent); }

.ad-rows { display: flex; flex-direction: column; gap: 10px; }

.ad-row { border: 1px solid var(--ad-line); border-radius: 9px; background: var(--ad-panel);
  padding: 12px; display: grid; grid-template-columns: auto minmax(0,1fr); gap: 12px; }
.ad-row-slim { align-items: center; }
.ad-row-body { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.ad-row-tools { display: flex; flex-direction: column; gap: 4px; }
.ad-row-tools button {
  width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--ad-line);
  background: transparent; color: var(--ad-dim); cursor: pointer; font-size: 13px; line-height: 1;
}
.ad-row-tools button:hover:not(:disabled) { color: var(--ad-text); border-color: var(--ad-accent); }
.ad-row-tools button:disabled { opacity: .3; cursor: default; }
.ad-row-tools .ad-del:hover { color: var(--ad-bad); border-color: var(--ad-bad); }

.ad-add { align-self: flex-start; background: transparent; border: 1px dashed var(--ad-line);
  color: var(--ad-dim); border-radius: 7px; padding: 8px 14px; font: inherit; font-size: 13px; cursor: pointer; }
.ad-add:hover { color: var(--ad-accent); border-color: var(--ad-accent); }

.ad-btn { background: transparent; border: 1px solid var(--ad-line); color: var(--ad-text);
  border-radius: 7px; padding: 9px 15px; font: inherit; font-size: 13.5px; cursor: pointer; white-space: nowrap; }
.ad-btn:hover:not(:disabled) { border-color: var(--ad-accent); color: var(--ad-accent); }
.ad-btn.primary { background: var(--ad-accent); border-color: var(--ad-accent); color: #061318; font-weight: 600; }
.ad-btn.primary:hover:not(:disabled) { opacity: .9; color: #061318; }
.ad-btn:disabled { opacity: .45; cursor: default; }
.ad-btn.ghost { color: var(--ad-dim); }

.ad-image { display: grid; grid-template-columns: 108px minmax(0,1fr); gap: 12px; align-items: start; }
.ad-image img { width: 108px; height: 76px; object-fit: cover; object-position: top center;
  border-radius: 6px; border: 1px solid var(--ad-line); background: #0B1114; }
.ad-image-empty { width: 108px; height: 76px; border-radius: 6px; border: 1px dashed var(--ad-line);
  display: grid; place-items: center; font-size: 11px; color: var(--ad-dim); }
.ad-image-side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ad-image-btns { display: flex; gap: 7px; flex-wrap: wrap; }

.ad-login-wrap { position: fixed; inset: 0; z-index: 9000; display: grid; place-items: center;
  background: rgba(8,14,17,.92); backdrop-filter: blur(6px); padding: 20px; }
.ad-login { background: var(--ad-panel); border: 1px solid var(--ad-line); border-radius: 12px;
  padding: 28px; width: min(380px, 100%); display: flex; flex-direction: column; gap: 12px; }
.ad-login h2 { margin: 0; font-size: 21px; }
.ad-login p { margin: 0; font-size: 14px; color: var(--ad-dim); }
.ad-login-btns { display: flex; gap: 9px; margin-top: 4px; }
.ad-err { color: var(--ad-bad) !important; font-size: 13px !important; }

.ad-float { position: fixed; right: 16px; z-index: 9000;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  background: var(--ad-accent); color: #061318; border: 0; border-radius: 100px;
  padding: 12px 20px; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
  box-shadow: 0 8px 26px -10px rgba(0,0,0,.7); }
`;
//#endregion
//#region .test/AdminTabs.jsx
function setPath(obj, path, value) {
	const next = Array.isArray(obj) ? [...obj] : { ...obj };
	let cur = next;
	for (let i = 0; i < path.length - 1; i++) {
		const k = path[i];
		cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
		cur = cur[k];
	}
	cur[path[path.length - 1]] = value;
	return next;
}
function move(arr, from, to) {
	if (to < 0 || to >= arr.length) return arr;
	const next = [...arr];
	const [item] = next.splice(from, 1);
	next.splice(to, 0, item);
	return next;
}
function Field({ label, hint, children }) {
	return /* @__PURE__ */ jsxs("label", {
		className: "ad-field",
		children: [/* @__PURE__ */ jsxs("span", {
			className: "ad-label",
			children: [label, hint && /* @__PURE__ */ jsx("em", { children: hint })]
		}), children]
	});
}
function Text({ value, onChange, placeholder }) {
	return /* @__PURE__ */ jsx("input", {
		className: "ad-input",
		value: value ?? "",
		placeholder,
		onChange: (e) => onChange(e.target.value)
	});
}
function Area({ value, onChange, rows = 4 }) {
	return /* @__PURE__ */ jsx("textarea", {
		className: "ad-input ad-area",
		rows,
		value: value ?? "",
		onChange: (e) => onChange(e.target.value)
	});
}
function Num({ value, onChange, min, max, suffix }) {
	return /* @__PURE__ */ jsxs("span", {
		className: "ad-num",
		children: [/* @__PURE__ */ jsx("input", {
			className: "ad-input",
			type: "number",
			min,
			max,
			value: value ?? 0,
			onChange: (e) => onChange(Number(e.target.value))
		}), suffix && /* @__PURE__ */ jsx("em", { children: suffix })]
	});
}
function Colour({ value, onChange }) {
	return /* @__PURE__ */ jsxs("span", {
		className: "ad-colour",
		children: [/* @__PURE__ */ jsx("input", {
			type: "color",
			value: value || "#000000",
			onChange: (e) => onChange(e.target.value)
		}), /* @__PURE__ */ jsx("input", {
			className: "ad-input",
			value: value ?? "",
			onChange: (e) => onChange(e.target.value)
		})]
	});
}
function Select({ value, onChange, options }) {
	return /* @__PURE__ */ jsx("select", {
		className: "ad-input",
		value: value ?? "",
		onChange: (e) => onChange(e.target.value),
		children: options.map((o) => /* @__PURE__ */ jsx("option", {
			value: o,
			children: o
		}, o))
	});
}
function Rows({ items, onChange, render, blank, addLabel = "Add" }) {
	const list = items || [];
	return /* @__PURE__ */ jsxs("div", {
		className: "ad-rows",
		children: [list.map((item, i) => /* @__PURE__ */ jsxs("div", {
			className: "ad-row",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "ad-row-tools",
				children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						title: "Move up",
						disabled: i === 0,
						onClick: () => onChange(move(list, i, i - 1)),
						children: "↑"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						title: "Move down",
						disabled: i === list.length - 1,
						onClick: () => onChange(move(list, i, i + 1)),
						children: "↓"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "ad-del",
						title: "Delete",
						onClick: () => {
							if (confirm("Delete this entry?")) onChange(list.filter((_, j) => j !== i));
						},
						children: "×"
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "ad-row-body",
				children: render(item, (patch) => onChange(list.map((x, j) => j === i ? {
					...x,
					...patch
				} : x)), i)
			})]
		}, i)), /* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "ad-add",
			onClick: () => onChange([...list, structuredClone(blank)]),
			children: ["+ ", addLabel]
		})]
	});
}
function StringList({ items, onChange, placeholder }) {
	const list = items || [];
	return /* @__PURE__ */ jsxs("div", {
		className: "ad-rows",
		children: [list.map((v, i) => /* @__PURE__ */ jsxs("div", {
			className: "ad-row ad-row-slim",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "ad-row-tools",
				children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: i === 0,
						onClick: () => onChange(move(list, i, i - 1)),
						children: "↑"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: i === list.length - 1,
						onClick: () => onChange(move(list, i, i + 1)),
						children: "↓"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "ad-del",
						onClick: () => onChange(list.filter((_, j) => j !== i)),
						children: "×"
					})
				]
			}), /* @__PURE__ */ jsx("input", {
				className: "ad-input",
				value: v,
				placeholder,
				onChange: (e) => onChange(list.map((x, j) => j === i ? e.target.value : x))
			})]
		}, i)), /* @__PURE__ */ jsx("button", {
			type: "button",
			className: "ad-add",
			onClick: () => onChange([...list, ""]),
			children: "+ Add"
		})]
	});
}
function ParaList({ items, onChange }) {
	const list = items || [];
	return /* @__PURE__ */ jsxs("div", {
		className: "ad-rows",
		children: [list.map((v, i) => /* @__PURE__ */ jsxs("div", {
			className: "ad-row",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "ad-row-tools",
				children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: i === 0,
						onClick: () => onChange(move(list, i, i - 1)),
						children: "↑"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: i === list.length - 1,
						onClick: () => onChange(move(list, i, i + 1)),
						children: "↓"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "ad-del",
						onClick: () => onChange(list.filter((_, j) => j !== i)),
						children: "×"
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "ad-row-body",
				children: /* @__PURE__ */ jsx("textarea", {
					className: "ad-input ad-area",
					rows: 4,
					value: v,
					onChange: (e) => onChange(list.map((x, j) => j === i ? e.target.value : x))
				})
			})]
		}, i)), /* @__PURE__ */ jsx("button", {
			type: "button",
			className: "ad-add",
			onClick: () => onChange([...list, ""]),
			children: "+ Add paragraph"
		})]
	});
}
function ImagePick({ value, onChange, token, onNotify }) {
	const inputRef = useRef(null);
	const [busy, setBusy] = useState(false);
	async function pick(e) {
		const file = e.target.files && e.target.files[0];
		e.target.value = "";
		if (!file) return;
		setBusy(true);
		try {
			onChange((await api.upload(token, file)).url);
			onNotify("Image uploaded.", "ok");
		} catch (err) {
			onNotify(err.message, "bad");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "ad-image",
		children: [value ? /* @__PURE__ */ jsx("img", {
			src: value,
			alt: ""
		}) : /* @__PURE__ */ jsx("div", {
			className: "ad-image-empty",
			children: "No image"
		}), /* @__PURE__ */ jsxs("div", {
			className: "ad-image-side",
			children: [
				/* @__PURE__ */ jsx("input", {
					className: "ad-input",
					value: value ?? "",
					placeholder: "/assets/name.png or a URL",
					onChange: (e) => onChange(e.target.value)
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "ad-image-btns",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "ad-btn",
						disabled: busy,
						onClick: () => inputRef.current.click(),
						children: busy ? "Uploading…" : "Upload image"
					}), value && /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "ad-btn ghost",
						onClick: () => onChange(""),
						children: "Clear"
					})]
				}),
				/* @__PURE__ */ jsx("input", {
					ref: inputRef,
					type: "file",
					accept: "image/*",
					hidden: true,
					onChange: pick
				})
			]
		})]
	});
}
function Login({ onToken, onExit }) {
	const [pw, setPw] = useState("");
	const [err, setErr] = useState("");
	const [busy, setBusy] = useState(false);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		setErr("");
		try {
			onToken((await api.login(pw)).token);
		} catch (e2) {
			setErr(e2.message);
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsx("div", {
		className: "ad-login-wrap",
		children: /* @__PURE__ */ jsxs("form", {
			className: "ad-login",
			onSubmit: submit,
			children: [
				/* @__PURE__ */ jsx("h2", { children: "Dashboard" }),
				/* @__PURE__ */ jsx("p", { children: "Sign in to edit the site." }),
				/* @__PURE__ */ jsx("input", {
					className: "ad-input",
					type: "password",
					autoFocus: true,
					value: pw,
					placeholder: "Password",
					onChange: (e) => setPw(e.target.value)
				}),
				err && /* @__PURE__ */ jsx("p", {
					className: "ad-err",
					children: err
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "ad-login-btns",
					children: [/* @__PURE__ */ jsx("button", {
						className: "ad-btn primary",
						disabled: busy || !pw,
						children: busy ? "Checking…" : "Sign in"
					}), /* @__PURE__ */ jsx("button", {
						className: "ad-btn ghost",
						type: "button",
						onClick: onExit,
						children: "Back to site"
					})]
				})
			]
		})
	});
}
var SECTIONS = [
	["theme", "Appearance"],
	["hero", "Hero"],
	["stats", "Stat band"],
	["research", "Research"],
	["publications", "Publications"],
	["software", "Software"],
	["experience", "Experience"],
	["background", "Background"],
	["contact", "Contact"],
	["nav", "Navigation"],
	["meta", "Page & footer"]
];
function Admin({ content, setContent, onExit, startTab }) {
	const [token, setToken] = useState("test-token");
	const [tab, setTab] = useState(startTab || "theme");
	const [note, setNote] = useState(null);
	const [dirty, setDirty] = useState(false);
	const [saving, setSaving] = useState(false);
	const [hidden, setHidden] = useState(false);
	const notify = (msg, kind = "ok") => {
		setNote({
			msg,
			kind
		});
		setTimeout(() => setNote(null), 4e3);
	};
	const set = (path, value) => {
		setContent((c) => setPath(c, path, value));
		setDirty(true);
	};
	useEffect(() => {
		const warn = (e) => {
			if (dirty) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);
	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape" && hidden) setHidden(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [hidden]);
	async function save() {
		setSaving(true);
		try {
			await api.saveContent(token, content);
			setDirty(false);
			notify("Saved. The live site is updated.", "ok");
		} catch (e) {
			notify(e.message, "bad");
		} finally {
			setSaving(false);
		}
	}
	if (!token) return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("style", { children: PANEL_CSS }), /* @__PURE__ */ jsx(Login, {
		onToken: setToken,
		onExit
	})] });
	if (hidden) return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("style", { children: PANEL_CSS }), /* @__PURE__ */ jsx("button", {
		className: "ad-float",
		onClick: () => setHidden(false),
		children: "Back to dashboard"
	})] });
	const t = content.theme;
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("style", { children: PANEL_CSS }), /* @__PURE__ */ jsxs("div", {
		className: "ad-shell",
		children: [/* @__PURE__ */ jsxs("aside", {
			className: "ad-side",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "ad-brand",
					children: "Dashboard"
				}),
				/* @__PURE__ */ jsx("nav", {
					className: "ad-nav",
					children: SECTIONS.map(([key, label]) => /* @__PURE__ */ jsx("button", {
						className: tab === key ? "on" : "",
						onClick: () => setTab(key),
						children: label
					}, key))
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "ad-side-foot",
					children: [/* @__PURE__ */ jsx("button", {
						className: "ad-btn ghost",
						onClick: () => setHidden(true),
						children: "Preview site"
					}), /* @__PURE__ */ jsx("button", {
						className: "ad-btn ghost",
						onClick: () => {
							if (!dirty || confirm("You have unsaved changes. Leave anyway?")) onExit();
						},
						children: "Exit"
					})]
				})
			]
		}), /* @__PURE__ */ jsxs("main", {
			className: "ad-main",
			children: [
				/* @__PURE__ */ jsxs("header", {
					className: "ad-top",
					children: [
						/* @__PURE__ */ jsx("h1", { children: SECTIONS.find(([k]) => k === tab)[1] }),
						/* @__PURE__ */ jsx("span", {
							className: "ad-state " + (dirty ? "dirty" : ""),
							children: dirty ? "Unsaved changes" : "All changes saved"
						}),
						/* @__PURE__ */ jsx("button", {
							className: "ad-btn primary",
							disabled: !dirty || saving,
							onClick: save,
							children: saving ? "Saving…" : "Save"
						})
					]
				}),
				note && /* @__PURE__ */ jsx("div", {
					className: "ad-note " + note.kind,
					children: note.msg
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "ad-body",
					children: [
						tab === "theme" && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsx("p", {
								className: "ad-help",
								children: "Changes show on the page behind this panel straight away. Nothing is public until you press Save."
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [
									/* @__PURE__ */ jsx(Field, {
										label: "Accent colour",
										hint: "light mode",
										children: /* @__PURE__ */ jsx(Colour, {
											value: t.accent,
											onChange: (v) => set(["theme", "accent"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Accent colour",
										hint: "dark mode",
										children: /* @__PURE__ */ jsx(Colour, {
											value: t.accentDark,
											onChange: (v) => set(["theme", "accentDark"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Page background",
										children: /* @__PURE__ */ jsx(Colour, {
											value: t.ground,
											onChange: (v) => set(["theme", "ground"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Card background",
										children: /* @__PURE__ */ jsx(Colour, {
											value: t.surface,
											onChange: (v) => set(["theme", "surface"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Text colour",
										children: /* @__PURE__ */ jsx(Colour, {
											value: t.ink,
											onChange: (v) => set(["theme", "ink"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Secondary text",
										children: /* @__PURE__ */ jsx(Colour, {
											value: t.muted,
											onChange: (v) => set(["theme", "muted"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Lines and borders",
										children: /* @__PURE__ */ jsx(Colour, {
											value: t.hair,
											onChange: (v) => set(["theme", "hair"], v)
										})
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [
									/* @__PURE__ */ jsx(Field, {
										label: "Heading font",
										children: /* @__PURE__ */ jsx(Select, {
											value: t.fontDisplay,
											options: FONTS.display,
											onChange: (v) => set(["theme", "fontDisplay"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Body font",
										children: /* @__PURE__ */ jsx(Select, {
											value: t.fontBody,
											options: FONTS.body,
											onChange: (v) => set(["theme", "fontBody"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Label font",
										hint: "small caps and data",
										children: /* @__PURE__ */ jsx(Select, {
											value: t.fontMono,
											options: FONTS.mono,
											onChange: (v) => set(["theme", "fontMono"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Body text size",
										children: /* @__PURE__ */ jsx(Num, {
											value: t.baseSize,
											min: 14,
											max: 22,
											suffix: "px",
											onChange: (v) => set(["theme", "baseSize"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Name size",
										hint: "largest width",
										children: /* @__PURE__ */ jsx(Num, {
											value: t.heroSize,
											min: 36,
											max: 110,
											suffix: "px",
											onChange: (v) => set(["theme", "heroSize"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Heading size",
										children: /* @__PURE__ */ jsx(Num, {
											value: t.headingSize,
											min: 22,
											max: 60,
											suffix: "px",
											onChange: (v) => set(["theme", "headingSize"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Corner rounding",
										children: /* @__PURE__ */ jsx(Num, {
											value: t.radius,
											min: 0,
											max: 28,
											suffix: "px",
											onChange: (v) => set(["theme", "radius"], v)
										})
									})
								]
							})
						] }),
						tab === "hero" && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsx(Field, {
								label: "Name",
								children: /* @__PURE__ */ jsx(Text, {
									value: content.hero.name,
									onChange: (v) => set(["hero", "name"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Availability line",
								children: /* @__PURE__ */ jsxs("label", {
									className: "ad-check",
									children: [/* @__PURE__ */ jsx("input", {
										type: "checkbox",
										checked: !!content.hero.showAvailable,
										onChange: (e) => set(["hero", "showAvailable"], e.target.checked)
									}), /* @__PURE__ */ jsx("span", { children: "Show it" })]
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Availability text",
								children: /* @__PURE__ */ jsx(Text, {
									value: content.hero.available,
									onChange: (v) => set(["hero", "available"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Intro paragraph",
								children: /* @__PURE__ */ jsx(Area, {
									rows: 5,
									value: content.hero.role,
									onChange: (v) => set(["hero", "role"], v)
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Linked phrase inside it",
									hint: "must match exactly",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.hero.roleLinkText,
										onChange: (v) => set(["hero", "roleLinkText"], v)
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Where that phrase links",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.hero.roleLinkUrl,
										onChange: (v) => set(["hero", "roleLinkUrl"], v)
									})
								})]
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Portrait",
								children: /* @__PURE__ */ jsx(ImagePick, {
									value: content.hero.portrait,
									token,
									onNotify: notify,
									onChange: (v) => set(["hero", "portrait"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Buttons",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.hero.links,
									blank: {
										label: "",
										url: "",
										primary: false
									},
									addLabel: "button",
									onChange: (v) => set(["hero", "links"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
										className: "ad-grid",
										children: [/* @__PURE__ */ jsx(Field, {
											label: "Label",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.label,
												onChange: (v) => patch({ label: v })
											})
										}), /* @__PURE__ */ jsx(Field, {
											label: "Link",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.url,
												onChange: (v) => patch({ url: v })
											})
										})]
									}), /* @__PURE__ */ jsxs("label", {
										className: "ad-check",
										children: [/* @__PURE__ */ jsx("input", {
											type: "checkbox",
											checked: !!item.primary,
											onChange: (e) => patch({ primary: e.target.checked })
										}), /* @__PURE__ */ jsx("span", { children: "Filled style" })]
									})] })
								})
							})
						] }),
						tab === "stats" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
							className: "ad-help",
							children: "The row of figures under the hero. Keep them to two or three words."
						}), /* @__PURE__ */ jsx(Rows, {
							items: content.stats,
							blank: {
								n: "",
								label: ""
							},
							addLabel: "figure",
							onChange: (v) => set(["stats"], v),
							render: (item, patch) => /* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Figure",
									children: /* @__PURE__ */ jsx(Text, {
										value: item.n,
										onChange: (v) => patch({ n: v })
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Label",
									children: /* @__PURE__ */ jsx(Text, {
										value: item.label,
										onChange: (v) => patch({ label: v })
									})
								})]
							})
						})] }),
						tab === "research" && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsx("div", {
								className: "ad-grid",
								children: /* @__PURE__ */ jsx(Field, {
									label: "Eyebrow",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.research.eyebrow,
										onChange: (v) => set(["research", "eyebrow"], v)
									})
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Heading",
								children: /* @__PURE__ */ jsx(Area, {
									rows: 2,
									value: content.research.heading,
									onChange: (v) => set(["research", "heading"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Paragraphs",
								children: /* @__PURE__ */ jsx(ParaList, {
									items: content.research.paragraphs,
									onChange: (v) => set(["research", "paragraphs"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Topic tags",
								children: /* @__PURE__ */ jsx(StringList, {
									items: content.research.tags,
									onChange: (v) => set(["research", "tags"], v),
									placeholder: "Polymer electrolytes"
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Figure caption heading",
								children: /* @__PURE__ */ jsx(Text, {
									value: content.research.figuresNote,
									onChange: (v) => set(["research", "figuresNote"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Figures from your papers",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.research.figures,
									blank: {
										src: "",
										cap: ""
									},
									addLabel: "figure",
									onChange: (v) => set(["research", "figures"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(ImagePick, {
										value: item.src,
										token,
										onNotify: notify,
										onChange: (v) => patch({ src: v })
									}), /* @__PURE__ */ jsx(Field, {
										label: "Caption",
										children: /* @__PURE__ */ jsx(Area, {
											rows: 2,
											value: item.cap,
											onChange: (v) => patch({ cap: v })
										})
									})] })
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Method columns",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.research.methods,
									blank: {
										title: "",
										text: ""
									},
									addLabel: "column",
									onChange: (v) => set(["research", "methods"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Field, {
										label: "Title",
										children: /* @__PURE__ */ jsx(Text, {
											value: item.title,
											onChange: (v) => patch({ title: v })
										})
									}), /* @__PURE__ */ jsx(Field, {
										label: "Text",
										children: /* @__PURE__ */ jsx(Area, {
											value: item.text,
											onChange: (v) => patch({ text: v })
										})
									})] })
								})
							})
						] }),
						tab === "publications" && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Eyebrow",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.publications.eyebrow,
										onChange: (v) => set(["publications", "eyebrow"], v)
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Heading",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.publications.heading,
										onChange: (v) => set(["publications", "heading"], v)
									})
								})]
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Note under the list",
								children: /* @__PURE__ */ jsx(Area, {
									rows: 2,
									value: content.publications.note,
									onChange: (v) => set(["publications", "note"], v)
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Linked phrase in the note",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.publications.noteLinkText,
										onChange: (v) => set(["publications", "noteLinkText"], v)
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Where it links",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.publications.noteLinkUrl,
										onChange: (v) => set(["publications", "noteLinkUrl"], v)
									})
								})]
							}),
							/* @__PURE__ */ jsx(Field, {
								label: `Papers (${(content.publications.items || []).length})`,
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.publications.items,
									addLabel: "paper",
									blank: {
										title: "",
										url: "",
										authors: "",
										me: "E. Yousef",
										journal: "",
										tags: [],
										lead: ""
									},
									onChange: (v) => set(["publications", "items"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs(Fragment, { children: [
										/* @__PURE__ */ jsx(Field, {
											label: "Title",
											children: /* @__PURE__ */ jsx(Area, {
												rows: 2,
												value: item.title,
												onChange: (v) => patch({ title: v })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Authors",
											children: /* @__PURE__ */ jsx(Area, {
												rows: 2,
												value: item.authors,
												onChange: (v) => patch({ authors: v })
											})
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "ad-grid",
											children: [
												/* @__PURE__ */ jsx(Field, {
													label: "Your name as written",
													hint: "gets bolded",
													children: /* @__PURE__ */ jsx(Text, {
														value: item.me,
														onChange: (v) => patch({ me: v })
													})
												}),
												/* @__PURE__ */ jsx(Field, {
													label: "Journal",
													children: /* @__PURE__ */ jsx(Text, {
														value: item.journal,
														onChange: (v) => patch({ journal: v })
													})
												}),
												/* @__PURE__ */ jsx(Field, {
													label: "Author note",
													children: /* @__PURE__ */ jsx(Text, {
														value: item.lead,
														placeholder: "First author",
														onChange: (v) => patch({ lead: v })
													})
												})
											]
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Link",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.url,
												onChange: (v) => patch({ url: v })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Small tags",
											hint: "JIF, quartile, citations",
											children: /* @__PURE__ */ jsx(StringList, {
												items: item.tags,
												onChange: (v) => patch({ tags: v }),
												placeholder: "JIF 9.5"
											})
										})
									] })
								})
							})
						] }),
						tab === "software" && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Eyebrow",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.software.eyebrow,
										onChange: (v) => set(["software", "eyebrow"], v)
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Heading",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.software.heading,
										onChange: (v) => set(["software", "heading"], v)
									})
								})]
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Intro paragraphs",
								children: /* @__PURE__ */ jsx(ParaList, {
									items: content.software.intro,
									onChange: (v) => set(["software", "intro"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Projects",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.software.projects,
									addLabel: "project",
									blank: {
										name: "",
										pills: [],
										ghostPills: [],
										desc: "",
										featured: {
											src: "",
											cap: ""
										},
										thumbs: [],
										facts: [],
										links: []
									},
									onChange: (v) => set(["software", "projects"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs(Fragment, { children: [
										/* @__PURE__ */ jsx(Field, {
											label: "Name",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.name,
												onChange: (v) => patch({ name: v })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Description",
											children: /* @__PURE__ */ jsx(Area, {
												value: item.desc,
												onChange: (v) => patch({ desc: v })
											})
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "ad-grid",
											children: [/* @__PURE__ */ jsx(Field, {
												label: "Filled tags",
												children: /* @__PURE__ */ jsx(StringList, {
													items: item.pills,
													onChange: (v) => patch({ pills: v })
												})
											}), /* @__PURE__ */ jsx(Field, {
												label: "Outline tags",
												children: /* @__PURE__ */ jsx(StringList, {
													items: item.ghostPills,
													onChange: (v) => patch({ ghostPills: v })
												})
											})]
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Main screenshot",
											children: /* @__PURE__ */ jsx(ImagePick, {
												value: item.featured && item.featured.src,
												token,
												onNotify: notify,
												onChange: (v) => patch({ featured: {
													...item.featured || {},
													src: v
												} })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Main screenshot caption",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.featured && item.featured.cap,
												onChange: (v) => patch({ featured: {
													...item.featured || {},
													cap: v
												} })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Thumbnails",
											children: /* @__PURE__ */ jsx(Rows, {
												items: item.thumbs,
												blank: {
													src: "",
													cap: ""
												},
												addLabel: "thumbnail",
												onChange: (v) => patch({ thumbs: v }),
												render: (th, tpatch) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(ImagePick, {
													value: th.src,
													token,
													onNotify: notify,
													onChange: (v) => tpatch({ src: v })
												}), /* @__PURE__ */ jsx(Field, {
													label: "Caption",
													children: /* @__PURE__ */ jsx(Text, {
														value: th.cap,
														onChange: (v) => tpatch({ cap: v })
													})
												})] })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Facts",
											children: /* @__PURE__ */ jsx(Rows, {
												items: item.facts,
												blank: {
													label: "",
													text: ""
												},
												addLabel: "fact",
												onChange: (v) => patch({ facts: v }),
												render: (f, fpatch) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Field, {
													label: "Label",
													children: /* @__PURE__ */ jsx(Text, {
														value: f.label,
														onChange: (v) => fpatch({ label: v })
													})
												}), /* @__PURE__ */ jsx(Field, {
													label: "Text",
													children: /* @__PURE__ */ jsx(Area, {
														value: f.text,
														onChange: (v) => fpatch({ text: v })
													})
												})] })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Links",
											children: /* @__PURE__ */ jsx(Rows, {
												items: item.links,
												blank: {
													label: "Repository",
													url: ""
												},
												addLabel: "link",
												onChange: (v) => patch({ links: v }),
												render: (l, lpatch) => /* @__PURE__ */ jsxs("div", {
													className: "ad-grid",
													children: [/* @__PURE__ */ jsx(Field, {
														label: "Label",
														children: /* @__PURE__ */ jsx(Text, {
															value: l.label,
															onChange: (v) => lpatch({ label: v })
														})
													}), /* @__PURE__ */ jsx(Field, {
														label: "URL",
														children: /* @__PURE__ */ jsx(Text, {
															value: l.url,
															onChange: (v) => lpatch({ url: v })
														})
													})]
												})
											})
										})
									] })
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Closing note",
								children: /* @__PURE__ */ jsx(Area, {
									value: content.software.shared,
									onChange: (v) => set(["software", "shared"], v)
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [
									/* @__PURE__ */ jsx(Field, {
										label: "Linked phrase",
										children: /* @__PURE__ */ jsx(Text, {
											value: content.software.sharedLinkText,
											onChange: (v) => set(["software", "sharedLinkText"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Where it links",
										children: /* @__PURE__ */ jsx(Text, {
											value: content.software.sharedLinkUrl,
											onChange: (v) => set(["software", "sharedLinkUrl"], v)
										})
									}),
									/* @__PURE__ */ jsx(Field, {
										label: "Text after the link",
										children: /* @__PURE__ */ jsx(Text, {
											value: content.software.sharedTail,
											onChange: (v) => set(["software", "sharedTail"], v)
										})
									})
								]
							})
						] }),
						tab === "experience" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
							className: "ad-grid",
							children: [/* @__PURE__ */ jsx(Field, {
								label: "Eyebrow",
								children: /* @__PURE__ */ jsx(Text, {
									value: content.experience.eyebrow,
									onChange: (v) => set(["experience", "eyebrow"], v)
								})
							}), /* @__PURE__ */ jsx(Field, {
								label: "Heading",
								children: /* @__PURE__ */ jsx(Text, {
									value: content.experience.heading,
									onChange: (v) => set(["experience", "heading"], v)
								})
							})]
						}), /* @__PURE__ */ jsx(Rows, {
							items: content.experience.items,
							addLabel: "position",
							blank: {
								when: "",
								title: "",
								where: "",
								whereUrl: "",
								whereTail: "",
								text: ""
							},
							onChange: (v) => set(["experience", "items"], v),
							render: (item, patch) => /* @__PURE__ */ jsxs(Fragment, { children: [
								/* @__PURE__ */ jsxs("div", {
									className: "ad-grid",
									children: [/* @__PURE__ */ jsx(Field, {
										label: "Dates",
										children: /* @__PURE__ */ jsx(Text, {
											value: item.when,
											onChange: (v) => patch({ when: v })
										})
									}), /* @__PURE__ */ jsx(Field, {
										label: "Role",
										children: /* @__PURE__ */ jsx(Text, {
											value: item.title,
											onChange: (v) => patch({ title: v })
										})
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "ad-grid",
									children: [
										/* @__PURE__ */ jsx(Field, {
											label: "Place",
											hint: "becomes the link",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.where,
												onChange: (v) => patch({ where: v })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Link",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.whereUrl,
												onChange: (v) => patch({ whereUrl: v })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Text after it",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.whereTail,
												onChange: (v) => patch({ whereTail: v })
											})
										})
									]
								}),
								/* @__PURE__ */ jsx(Field, {
									label: "Description",
									children: /* @__PURE__ */ jsx(Area, {
										value: item.text,
										onChange: (v) => patch({ text: v })
									})
								})
							] })
						})] }),
						tab === "background" && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Eyebrow",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.background.eyebrow,
										onChange: (v) => set(["background", "eyebrow"], v)
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Heading",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.background.heading,
										onChange: (v) => set(["background", "heading"], v)
									})
								})]
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Degrees",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.background.education,
									blank: {
										when: "",
										title: "",
										where: "",
										text: ""
									},
									addLabel: "degree",
									onChange: (v) => set(["background", "education"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs(Fragment, { children: [
										/* @__PURE__ */ jsxs("div", {
											className: "ad-grid",
											children: [/* @__PURE__ */ jsx(Field, {
												label: "Dates",
												children: /* @__PURE__ */ jsx(Text, {
													value: item.when,
													onChange: (v) => patch({ when: v })
												})
											}), /* @__PURE__ */ jsx(Field, {
												label: "Degree",
												children: /* @__PURE__ */ jsx(Text, {
													value: item.title,
													onChange: (v) => patch({ title: v })
												})
											})]
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Institution",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.where,
												onChange: (v) => patch({ where: v })
											})
										}),
										/* @__PURE__ */ jsx(Field, {
											label: "Extra line",
											children: /* @__PURE__ */ jsx(Area, {
												rows: 2,
												value: item.text,
												onChange: (v) => patch({ text: v })
											})
										})
									] })
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Awards column title",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.background.awardsTitle,
										onChange: (v) => set(["background", "awardsTitle"], v)
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Review column title",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.background.reviewTitle,
										onChange: (v) => set(["background", "reviewTitle"], v)
									})
								})]
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Awards",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.background.awards,
									blank: {
										name: "",
										year: ""
									},
									addLabel: "award",
									onChange: (v) => set(["background", "awards"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs("div", {
										className: "ad-grid",
										children: [/* @__PURE__ */ jsx(Field, {
											label: "Award",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.name,
												onChange: (v) => patch({ name: v })
											})
										}), /* @__PURE__ */ jsx(Field, {
											label: "Year",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.year,
												onChange: (v) => patch({ year: v })
											})
										})]
									})
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Journals reviewed for",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.background.review,
									blank: {
										name: "",
										year: ""
									},
									addLabel: "journal",
									onChange: (v) => set(["background", "review"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs("div", {
										className: "ad-grid",
										children: [/* @__PURE__ */ jsx(Field, {
											label: "Journal",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.name,
												onChange: (v) => patch({ name: v })
											})
										}), /* @__PURE__ */ jsx(Field, {
											label: "Year",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.year,
												onChange: (v) => patch({ year: v })
											})
										})]
									})
								})
							}),
							/* @__PURE__ */ jsx("div", {
								className: "ad-grid",
								children: /* @__PURE__ */ jsx(Field, {
									label: "Leadership title",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.background.leadershipTitle,
										onChange: (v) => set(["background", "leadershipTitle"], v)
									})
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Leadership text",
								children: /* @__PURE__ */ jsx(Area, {
									rows: 5,
									value: content.background.leadership,
									onChange: (v) => set(["background", "leadership"], v)
								})
							})
						] }),
						tab === "contact" && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsx("div", {
								className: "ad-grid",
								children: /* @__PURE__ */ jsx(Field, {
									label: "Eyebrow",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.contact.eyebrow,
										onChange: (v) => set(["contact", "eyebrow"], v)
									})
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Heading",
								children: /* @__PURE__ */ jsx(Area, {
									rows: 2,
									value: content.contact.heading,
									onChange: (v) => set(["contact", "heading"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Text",
								children: /* @__PURE__ */ jsx(Area, {
									rows: 5,
									value: content.contact.text,
									onChange: (v) => set(["contact", "text"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Contact buttons",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.contact.links,
									blank: {
										label: "",
										url: "",
										primary: false
									},
									addLabel: "button",
									onChange: (v) => set(["contact", "links"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
										className: "ad-grid",
										children: [/* @__PURE__ */ jsx(Field, {
											label: "Label",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.label,
												onChange: (v) => patch({ label: v })
											})
										}), /* @__PURE__ */ jsx(Field, {
											label: "Link",
											hint: "mailto: or tel: work too",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.url,
												onChange: (v) => patch({ url: v })
											})
										})]
									}), /* @__PURE__ */ jsxs("label", {
										className: "ad-check",
										children: [/* @__PURE__ */ jsx("input", {
											type: "checkbox",
											checked: !!item.primary,
											onChange: (e) => patch({ primary: e.target.checked })
										}), /* @__PURE__ */ jsx("span", { children: "Filled style" })]
									})] })
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Research groups title",
								children: /* @__PURE__ */ jsx(Text, {
									value: content.contact.groupsTitle,
									onChange: (v) => set(["contact", "groupsTitle"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Research groups",
								children: /* @__PURE__ */ jsx(Rows, {
									items: content.contact.groups,
									blank: {
										label: "",
										url: ""
									},
									addLabel: "group",
									onChange: (v) => set(["contact", "groups"], v),
									render: (item, patch) => /* @__PURE__ */ jsxs("div", {
										className: "ad-grid",
										children: [/* @__PURE__ */ jsx(Field, {
											label: "Label",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.label,
												onChange: (v) => patch({ label: v })
											})
										}), /* @__PURE__ */ jsx(Field, {
											label: "Link",
											children: /* @__PURE__ */ jsx(Text, {
												value: item.url,
												onChange: (v) => patch({ url: v })
											})
										})]
									})
								})
							})
						] }),
						tab === "nav" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
							className: "ad-help",
							children: "The links in the bar at the top. Each target must match a section id on the page: research, publications, software, experience, background, contact."
						}), /* @__PURE__ */ jsx(Rows, {
							items: content.nav,
							blank: {
								label: "",
								href: "#"
							},
							addLabel: "link",
							onChange: (v) => set(["nav"], v),
							render: (item, patch) => /* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Label",
									children: /* @__PURE__ */ jsx(Text, {
										value: item.label,
										onChange: (v) => patch({ label: v })
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Target",
									children: /* @__PURE__ */ jsx(Text, {
										value: item.href,
										onChange: (v) => patch({ href: v })
									})
								})]
							})
						})] }),
						tab === "meta" && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsx(Field, {
								label: "Browser tab title",
								children: /* @__PURE__ */ jsx(Text, {
									value: content.meta.title,
									onChange: (v) => set(["meta", "title"], v)
								})
							}),
							/* @__PURE__ */ jsx(Field, {
								label: "Search description",
								hint: "about 150 characters",
								children: /* @__PURE__ */ jsx(Area, {
									rows: 3,
									value: content.meta.description,
									onChange: (v) => set(["meta", "description"], v)
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ad-grid",
								children: [/* @__PURE__ */ jsx(Field, {
									label: "Footer left",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.footer.left,
										onChange: (v) => set(["footer", "left"], v)
									})
								}), /* @__PURE__ */ jsx(Field, {
									label: "Footer right",
									children: /* @__PURE__ */ jsx(Text, {
										value: content.footer.right,
										onChange: (v) => set(["footer", "right"], v)
									})
								})]
							})
						] })
					]
				})
			]
		})]
	})] });
}
var seed_default = {
	theme: {
		"accent": "#A32617",
		"accentDark": "#E0705F",
		"ground": "#FCFBF8",
		"surface": "#FFFFFF",
		"ink": "#1A1A18",
		"muted": "#27406B",
		"hair": "#D7DAE2",
		"fontDisplay": "Newsreader",
		"fontBody": "Archivo",
		"fontMono": "IBM Plex Mono",
		"baseSize": 17,
		"heroSize": 64,
		"headingSize": 32,
		"radius": 2
	},
	meta: {
		"title": "Ezzeldien Yousef, Materials Researcher",
		"description": "PhD researcher in Mechanical and Industrial Engineering at the University of Toronto. Polymer electrolytes, supercapacitors, nanomaterials and aerogel fibres."
	},
	nav: [
		{
			"label": "Research",
			"href": "#research"
		},
		{
			"label": "Publications",
			"href": "#publications"
		},
		{
			"label": "Software",
			"href": "#software"
		},
		{
			"label": "Experience",
			"href": "#experience"
		},
		{
			"label": "Background",
			"href": "#background"
		},
		{
			"label": "Contact",
			"href": "#contact"
		}
	],
	hero: {
		"available": "Open to collaboration and freelance work",
		"showAvailable": true,
		"name": "Ezzeldien Yousef",
		"role": "PhD researcher in Mechanical & Industrial Engineering at the University of Toronto, in the Microcellular Plastics Manufacturing Laboratory. I work on polymer electrolytes, energy storage and aerogel fibres, and I build the software that turns laboratory data into results.",
		"roleLinkText": "Microcellular Plastics Manufacturing Laboratory",
		"roleLinkUrl": "https://mpml.mie.utoronto.ca/lab/personnel/",
		"portrait": "/assets/portrait.jpg",
		"links": [
			{
				"label": "Email me",
				"url": "mailto:ezzyousef@aucegypt.edu",
				"primary": true
			},
			{
				"label": "Google Scholar",
				"url": "https://scholar.google.com/citations?user=m0Rs9oIAAAAJ&hl=en",
				"primary": false
			},
			{
				"label": "GitHub",
				"url": "https://github.com/ezzyousef",
				"primary": false
			},
			{
				"label": "LinkedIn",
				"url": "https://www.linkedin.com/in/ezz-eldien-yousef",
				"primary": false
			}
		]
	},
	stats: [
		{
			"n": "12",
			"label": "Peer-reviewed papers"
		},
		{
			"n": "7",
			"label": "Journals reviewed for"
		},
		{
			"n": "4",
			"label": "Research tools built"
		}
	],
	research: {
		"eyebrow": "What I work on",
		"heading": "Making energy materials survive the conditions they are actually used in",
		"paragraphs": ["My research sits between chemistry and engineering: designing materials, measuring what they do, and explaining why. Most of it has been about electrolytes, the part of an energy-storage device that usually fails first when it gets too cold, too hot or too dry.", "In my MSc work I tuned ion mobility and molecular confinement in gel electrolytes, and showed supercapacitors that keep cycling far below freezing. My PhD at the Microcellular Plastics Manufacturing Laboratory moves this into polymer processing: lightweight aerogel fibres for thermal insulation, including clothing and wearable applications."],
		"tags": [
			"Polymer electrolytes",
			"Supercapacitors",
			"Electrochemistry",
			"Nanomaterials",
			"Aerogel fibres",
			"Polymer foaming",
			"Electrospinning",
			"Thermal insulation",
			"Photocatalysis",
			"CO₂ electroreduction",
			"UV shielding",
			"Scientific data analysis"
		],
		"methods": [
			{
				"title": "Electrochemistry",
				"text": "Cyclic voltammetry, galvanostatic charge–discharge, impedance spectroscopy, chronoamperometry. Full supercapacitor device assembly and testing."
			},
			{
				"title": "Characterization",
				"text": "SEM, TEM, XRD, EDX, Raman, FTIR, UV–Vis, BET and TGA, with interpretation rather than just acquisition."
			},
			{
				"title": "Synthesis",
				"text": "Electrospinning, sol–gel, hydrothermal routes, electrodeposition, polymer gel and hydrogel preparation."
			},
			{
				"title": "Analysis",
				"text": "OriginLab, Excel, publication figures, and purpose-built software for laboratory data workflows."
			}
		],
		"figuresNote": "Figures from my own published work.",
		"figures": [
			{
				"src": "/assets/fig-ppa-pam.jpg",
				"cap": "PPA/PAM proton-conducting hydrogel, frozen at −65 °C and dried. From the halide-free protonic gel electrolyte work."
			},
			{
				"src": "/assets/fig-cmc-aerogel.jpg",
				"cap": "Carboxymethyl cellulose aerogel loaded with a deep eutectic electrolyte, for freeze-tolerant supercapacitors."
			},
			{
				"src": "/assets/fig-cevo4-xrd.jpg",
				"cap": "XRD patterns and FTIR spectra of recycled cellulose acetate membranes filled with CeVO₄."
			}
		]
	},
	publications: {
		"eyebrow": "12 peer-reviewed articles",
		"heading": "Publications",
		"note": "Impact factors and citation counts as recorded in September 2026. The current list is on Google Scholar.",
		"noteLinkText": "Google Scholar",
		"noteLinkUrl": "https://scholar.google.com/citations?user=m0Rs9oIAAAAJ&hl=en",
		"items": [
			{
				"title": "Halide-free protonic gel electrolytes for ultra-long-life, extreme-temperature energy storage",
				"url": "https://pubs.rsc.org/ta/article/doi/10.1039/d6ta05502h/1298970/Halide-free-protonic-gel-electrolytes-for-ultra",
				"authors": "E. Yousef, A. A. Ismail, G. E. Khedr, N. K. Allam",
				"me": "E. Yousef",
				"journal": "Journal of Materials Chemistry A",
				"tags": ["JIF 9.5", "Q1"],
				"lead": "First author"
			},
			{
				"title": "Engineering reline/carboxymethyl cellulose eutectogel electrolytes through nanoscale water confinement and coordination-driven ion percolation",
				"url": "https://doi.org/10.1016/j.cej.2026.176245",
				"authors": "A. A. Akar, M. A. Moselhy, G. E. Khedr, E. Yousef, N. K. Allam",
				"me": "E. Yousef",
				"journal": "Chemical Engineering Journal",
				"tags": [
					"JIF 13.2",
					"Q1",
					"3 citations"
				],
				"lead": ""
			},
			{
				"title": "Hierarchical aerogel-confined deep eutectic electrolytes for complete water immobilization and high-performance, freeze-tolerant supercapacitors",
				"url": "https://doi.org/10.1039/D6TA00216A",
				"authors": "M. A. Moselhy, G. E. Khedr, E. Yousef, A. A. Akar, N. K. Allam",
				"me": "E. Yousef",
				"journal": "Journal of Materials Chemistry A",
				"tags": [
					"JIF 9.5",
					"Q1",
					"3 citations"
				],
				"lead": ""
			},
			{
				"title": "LiBr@PQ-7 electrolyte for voltage-stable, freeze-tolerant supercapacitors",
				"url": "https://www.sciencedirect.com/science/article/abs/pii/S1385894725122882",
				"authors": "E. Yousef, G. E. Khedr, A. A. Akar, N. K. Allam",
				"me": "E. Yousef",
				"journal": "Chemical Engineering Journal",
				"tags": [
					"JIF 13.2",
					"Q1",
					"5 citations"
				],
				"lead": "First author"
			},
			{
				"title": "Cation-driven hydrogen bond dynamics in energy storage hydrogel electrolytes: unravelling ion–water–carbon interactions",
				"url": "https://pubs.rsc.org/en/content/articlelanding/2025/ta/d5ta00825e/unauth",
				"authors": "E. Yousef*, A. A. Akar*, A. A. M. Ismail, G. E. Khedr, N. K. Allam",
				"me": "E. Yousef",
				"journal": "Journal of Materials Chemistry A",
				"tags": [
					"JIF 9.5",
					"Q1",
					"15 citations"
				],
				"lead": "Joint first author"
			},
			{
				"title": "Tuning C–C coupling and selectivity in the CO₂ electrochemical reduction reaction via pyramidal dilute Sn–Cu alloy",
				"url": "https://doi.org/10.1021/acsami.5c20454",
				"authors": "A. A. Ashour, A. M. Abdelmohsen, G. E. Khedr, K. E. Salem, I. M. Badawy, E. Yousef, A. M. Agour, D. Higgins, N. K. Allam",
				"me": "E. Yousef",
				"journal": "ACS Applied Materials & Interfaces",
				"tags": [
					"JIF 8.2",
					"Q1",
					"7 citations"
				],
				"lead": ""
			},
			{
				"title": "Recycled cellulose acetate/cerium vanadate nanoparticle composite membranes with tuned ultraviolet and blue light shielding capabilities",
				"url": "https://doi.org/10.1021/acsapm.4c01778",
				"authors": "E. Yousef, M. M. Taha, M. K. M. Ali, N. K. Allam",
				"me": "E. Yousef",
				"journal": "ACS Applied Polymer Materials",
				"tags": [
					"JIF 5.0",
					"Q1",
					"14 citations"
				],
				"lead": "First author"
			},
			{
				"title": "Optimized poly(methyl methacrylate)/mixed-phase silver vanadate nanocomposites with tuned optical properties and hydrophobicity",
				"url": "https://doi.org/10.1002/app.55831",
				"authors": "E. Yousef, M. K. M. Ali, N. K. Allam",
				"me": "E. Yousef",
				"journal": "Journal of Applied Polymer Science",
				"tags": [
					"JIF 2.8",
					"Q2",
					"15 citations"
				],
				"lead": "First author"
			},
			{
				"title": "Tuning the optical properties and hydrophobicity of BiVO₄/PVC/PVP composites as potential candidates for optoelectronic applications",
				"url": "https://doi.org/10.1016/j.optmat.2024.115193",
				"authors": "E. Yousef, M. K. M. Ali, N. K. Allam",
				"me": "E. Yousef",
				"journal": "Optical Materials",
				"tags": [
					"JIF 4.2",
					"Q1",
					"30 citations"
				],
				"lead": "First author"
			},
			{
				"title": "Electrospun nanofibrous scaffolds of polylactic acid loaded with ginger/MoO₃/CuO/graphene oxide: biocompatibility and antibacterial activity",
				"url": "https://doi.org/10.1007/s00289-024-05322-w",
				"authors": "E. Yousef, M. Salah, H. A. Yousef, M. Ibrahim, M. S. Mostafa, H. M. Abd Elkabeer, M. Khalaf, A.-H. M. Rasmey, I. Morad",
				"me": "E. Yousef",
				"journal": "Polymer Bulletin",
				"tags": [
					"JIF 4.0",
					"Q2",
					"17 citations"
				],
				"lead": "First author"
			},
			{
				"title": "Removal of inorganic pollutants and recovery of nutrients from wastewater using electrocoagulation: a review",
				"url": "https://doi.org/10.3390/separations11110320",
				"authors": "M. Ammar, E. Yousef, S. Ashraf, J. Baltrusaitis",
				"me": "E. Yousef",
				"journal": "Separations",
				"tags": [
					"JIF 2.7",
					"Q3",
					"23 citations"
				],
				"lead": ""
			},
			{
				"title": "A comprehensive review of the developments in electrocoagulation for removal of contaminants from wastewater",
				"url": "https://www.mdpi.com/2297-8739/10/6/337",
				"authors": "M. Ammar, E. Yousef, M. A. Mahmoud, S. Ashraf, J. Baltrusaitis",
				"me": "E. Yousef",
				"journal": "Separations",
				"tags": [
					"JIF 2.7",
					"Q3",
					"69 citations"
				],
				"lead": ""
			}
		]
	},
	software: {
		"eyebrow": "Research tools I built",
		"heading": "Software for the laboratory",
		"intro": ["Four desktop applications that take instrument files and return finished results and publication figures. Each one exists because a workflow in my own laboratory was slow, manual or easy to get wrong.", "I use AI-assisted development for the implementation: I provide the scientific requirements, the equations and the experimental logic, and direct the build. My background is experimental science first and software second, and I would rather say that plainly than overstate it."],
		"shared": "labkit, a shared internal library underneath all four applications: unit handling, figure styling, Excel writing and OriginLab export. Building it once is why every tool produces figures that look like they came from the same laboratory.",
		"sharedLinkText": "Energy Materials Laboratory website",
		"sharedLinkUrl": "https://eml-site.vercel.app/",
		"sharedTail": "is a separate project, built for the group at AUC.",
		"projects": [
			{
				"name": "AeroLab Studio",
				"pills": ["Open source"],
				"ghostPills": ["Aerogel fibres"],
				"desc": "An analysis workbench for aerogel-fibre research. It implements every equation and measurement from three papers on thermoplastic-polyurethane aerogels, applied by hand or automatically, and exports straight into OriginLab and Excel.",
				"featured": {
					"src": "/assets/aerolab-plots.png",
					"cap": "Plots, several runs of one measurement on shared axes"
				},
				"thumbs": [
					{
						"src": "/assets/aerolab-validation.png",
						"cap": "Validation, every case, its published and computed value, and its status"
					},
					{
						"src": "/assets/aerolab-measurements.png",
						"cap": "Measurements, runs on the left, results on the right"
					},
					{
						"src": "/assets/aerolab-export.png",
						"cap": "Export, scope, Excel workbook, OriginLab and figure set"
					}
				],
				"facts": [
					{
						"label": "59 equations",
						"text": "Every relation in the source papers, with unit conversion on each input and uncertainty propagated by central differences."
					},
					{
						"label": "11 measurements",
						"text": "Stress–strain, cyclic loading, S–N, strain–life, density scaling, TGA, DSC, thermal properties, BET, Herschel–Bulkley, amplitude sweep."
					},
					{
						"label": "26 validation cases",
						"text": "Recomputes values printed in the papers. Two are recorded as disagreements with the papers, with the reasoning stated, rather than quietly adjusted."
					}
				],
				"links": [{
					"label": "Repository",
					"url": "https://github.com/ezzyousef/AeroLab-Studio"
				}]
			},
			{
				"name": "Supercap Suite",
				"pills": ["Open source"],
				"ghostPills": ["Electrochemistry"],
				"desc": "The tool I wanted during my MSc. It turns raw electrochemical files into device performance: capacitance, energy and power density, rate behaviour and impedance, with the equations visible rather than hidden in a spreadsheet.",
				"featured": {
					"src": "/assets/sc-nyquist.png",
					"cap": "An impedance spectrum previewed as a Nyquist plot"
				},
				"thumbs": [
					{
						"src": "/assets/sc-charge.png",
						"cap": "The charge / discharge tool before a file is loaded"
					},
					{
						"src": "/assets/sc-rate.png",
						"cap": "The rate study tool"
					},
					{
						"src": "/assets/sc-origin.png",
						"cap": "An impedance spectrum and its circuit fit, as built in OriginLab"
					}
				],
				"facts": [
					{
						"label": "Device metrics",
						"text": "Specific capacitance, energy and power density, coulombic efficiency, rate capability and cycling stability from CV and GCD data."
					},
					{
						"label": "Impedance",
						"text": "Nyquist and Bode views with equivalent-circuit fitting, exported as a finished OriginLab figure."
					},
					{
						"label": "Manual calculator",
						"text": "Every equation available on its own, so a single number can be checked without running a whole dataset."
					}
				],
				"links": [{
					"label": "Repository",
					"url": "https://github.com/ezzyousef/supercap_suite"
				}]
			},
			{
				"name": "FTIR & XRD Toolkit",
				"pills": ["Open source"],
				"ghostPills": ["Characterization"],
				"desc": "Spectra and diffraction patterns processed, identified and explained. It detects peaks, matches them against a reference database of material bands, and calculates the numbers that usually get done by hand.",
				"featured": {
					"src": "/assets/fx-ftir.png",
					"cap": "An FTIR spectrum with detected peaks, database matches and reference bands"
				},
				"thumbs": [
					{
						"src": "/assets/fx-xrd.png",
						"cap": "An XRD pattern with d-spacings and Scherrer sizes calculated"
					},
					{
						"src": "/assets/fx-origin.png",
						"cap": "Two FTIR spectra and a fitted-peak model, as built in OriginLab"
					},
					{
						"src": "/assets/fx-database.png",
						"cap": "The reference database with a material's bands shown"
					}
				],
				"facts": [
					{
						"label": "Peak identification",
						"text": "Automatic detection with assignment against a built-in database of characteristic bands."
					},
					{
						"label": "XRD analysis",
						"text": "d-spacings and Scherrer crystallite sizes calculated directly from the pattern."
					},
					{
						"label": "Figure export",
						"text": "Fitted-peak models rebuilt in OriginLab with the wavenumber axis in the conventional direction."
					}
				],
				"links": [{
					"label": "Repository",
					"url": "https://github.com/ezzyousef/FTIR-XRD-Analysis-Toolkit"
				}]
			},
			{
				"name": "Brookfield DV1 Logger",
				"pills": ["Open source"],
				"ghostPills": ["Instrument control"],
				"desc": "A viscometer that could only show readings on its own screen now records them. The logger talks to a Brookfield DV1 over serial, captures a run automatically, and fits the rheology while the measurement is still going.",
				"featured": {
					"src": "/assets/dv-dashboard.png",
					"cap": "The dashboard with a shear-rate sweep of a PVA hydrogel logged"
				},
				"thumbs": [
					{
						"src": "/assets/dv-viscosity.png",
						"cap": "Viscosity against shear rate with the power-law fit"
					},
					{
						"src": "/assets/dv-origin.png",
						"cap": "Viscosity against shear rate, as built in OriginLab"
					},
					{
						"src": "/assets/dv-serial.png",
						"cap": "The serial page: auto-capture and terminal"
					}
				],
				"facts": [
					{
						"label": "Live capture",
						"text": "Reads the instrument over serial and builds the session as the measurement runs, with a terminal for raw traffic."
					},
					{
						"label": "Rheology fits",
						"text": "Viscosity against shear rate with power-law fitting and per-run statistics."
					},
					{
						"label": "Session export",
						"text": "Full data tables out to Excel, and the same curve rebuilt as an OriginLab figure."
					}
				],
				"links": [{
					"label": "Repository",
					"url": "https://github.com/ezzyousef/brookfield-dv1-logger"
				}]
			}
		]
	},
	experience: {
		"eyebrow": "Research positions",
		"heading": "Experience",
		"items": [
			{
				"when": "Sep 2026 – present",
				"title": "Research Assistant",
				"where": "Microcellular Plastics Manufacturing Laboratory",
				"whereUrl": "https://mpml.mie.utoronto.ca/lab/personnel/",
				"whereTail": ", University of Toronto",
				"text": "Doctoral research on polymeric aerogels reinforced with nanofibres for clothing and thermal-insulation applications, under Prof. Chul B. Park."
			},
			{
				"when": "May 2023 – Aug 2026",
				"title": "Research Assistant",
				"where": "Energy Materials Laboratory",
				"whereUrl": "https://eml-site.vercel.app/",
				"whereTail": ", The American University in Cairo",
				"text": "Synthesis and characterization of polymeric membranes, semiconductors and quasi-solid-state electrolytes. Built and tested supercapacitor devices, ran full electrochemical characterization, and set up a UV reactor for UV-shielding work. Most of my publication record comes from this period."
			},
			{
				"when": "2021 – May 2023",
				"title": "Undergraduate Research Assistant",
				"where": "Suez University",
				"whereUrl": "",
				"whereTail": "",
				"text": "Nanofibrous scaffolds for wound healing under STDF grant 45441. The laboratory had no electrospinning system, so I built a working setup from available parts and tuned it until it produced stable fibres. Also applied electrocoagulation to contaminant removal from wastewater."
			}
		]
	},
	background: {
		"eyebrow": "Background",
		"heading": "Education, awards and service",
		"education": [
			{
				"when": "2026 – 2030",
				"title": "PhD, Mechanical & Industrial Engineering",
				"where": "University of Toronto",
				"text": ""
			},
			{
				"when": "2023 – 2026",
				"title": "MSc Nanotechnology, GPA 4.0 / 4.0",
				"where": "The American University in Cairo",
				"text": "Thesis: “Tuning Ion Mobility and Molecular Confinement in High-Performance Polymer Electrolytes for Energy Storage”."
			},
			{
				"when": "2018 – 2022",
				"title": "BSc, Physics (Engineering Physics)",
				"where": "Suez University. Very Good with Honors, ranked third in the class",
				"text": ""
			}
		],
		"awardsTitle": "Awards",
		"awards": [
			{
				"name": "Allehdaan Best Thesis Award",
				"year": "2026"
			},
			{
				"name": "School of Sciences & Engineering Honors, AUC",
				"year": "2026"
			},
			{
				"name": "Best Researcher Award, Science Father",
				"year": "2024"
			},
			{
				"name": "Laboratory Fellowship, AUC",
				"year": "2024"
			},
			{
				"name": "University Fellowship, AUC",
				"year": "2023"
			}
		],
		"reviewTitle": "Peer review",
		"review": [
			{
				"name": "Journal of Materials Science: Polymers",
				"year": "2025"
			},
			{
				"name": "J. Materials Science: Materials in Electronics",
				"year": "2025"
			},
			{
				"name": "Journal of Polymers and the Environment",
				"year": "2025"
			},
			{
				"name": "Cellulose",
				"year": "2025"
			},
			{
				"name": "Polymer Bulletin",
				"year": "2025"
			},
			{
				"name": "Plasmonics",
				"year": "2025"
			},
			{
				"name": "Polymer Engineering & Science",
				"year": "2025"
			}
		],
		"leadershipTitle": "Leadership",
		"leadership": "Founder and Vice President of the Innovative Nanotechnology Club at AUC, and co-founder of the Sustainability, Energy and Nanomaterials Association student chapter. Elected Vice President of the AUC student chapter of The Electrochemical Society. I have organized lecture series, workshops, competitions and outreach events around energy and nanotechnology."
	},
	contact: {
		"eyebrow": "Get in touch",
		"heading": "Open to collaboration, consulting and research work",
		"text": "I am interested in collaborations on energy materials and polymer processing, and I take on freelance work in electrochemical data analysis, characterization data interpretation, publication figures and scientific writing. If you have data and are not sure what it is telling you, send it over.",
		"links": [
			{
				"label": "ezzyousef@aucegypt.edu",
				"url": "mailto:ezzyousef@aucegypt.edu",
				"primary": true
			},
			{
				"label": "+1 942 662 0110",
				"url": "tel:+19426620110",
				"primary": false
			},
			{
				"label": "LinkedIn",
				"url": "https://www.linkedin.com/in/ezz-eldien-yousef",
				"primary": false
			},
			{
				"label": "Google Scholar",
				"url": "https://scholar.google.com/citations?user=m0Rs9oIAAAAJ&hl=en",
				"primary": false
			},
			{
				"label": "GitHub",
				"url": "https://github.com/ezzyousef",
				"primary": false
			}
		],
		"groupsTitle": "Research groups",
		"groups": [{
			"label": "MPML, University of Toronto",
			"url": "https://mpml.mie.utoronto.ca/lab/personnel/"
		}, {
			"label": "Energy Materials Lab, AUC",
			"url": "https://eml-site.vercel.app/"
		}]
	},
	footer: {
		"left": "Ezzeldien Muhammed Yousef · Toronto, Canada",
		"right": "Updated September 2026"
	}
};
//#endregion
//#region .test/render3.jsx
var tabs = [
	"theme",
	"hero",
	"stats",
	"research",
	"publications",
	"software",
	"experience",
	"background",
	"contact",
	"nav",
	"meta"
];
var failures = 0;
for (const tab of tabs) try {
	const n = renderToString(/* @__PURE__ */ jsx(Admin, {
		content: seed_default,
		setContent: () => {},
		onExit: () => {},
		startTab: tab
	})).length;
	console.log(`  ok    ${tab.padEnd(14)} ${n} chars`);
} catch (e) {
	failures++;
	console.log(`  FAIL  ${tab.padEnd(14)} ${e.message}`);
	console.log("        " + (e.stack || "").split("\n").slice(1, 4).join("\n        "));
}
console.log(failures ? `\n${failures} tab(s) crash on render` : "\nall tabs render");
//#endregion
export {};
