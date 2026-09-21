/* The dashboard keeps its own palette so it stays readable whatever the site
   theme is set to. Only the accent follows the site. */
export const PANEL_CSS = `
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
