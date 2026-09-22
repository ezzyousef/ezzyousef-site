import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { FONTS } from '../theme.js';
import { PANEL_CSS } from './panel-css.js';

/* ------------------------------------------------------------------ utils */

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

function getPath(obj, path) {
  return path.reduce((o, k) => (o == null ? o : o[k]), obj);
}

function move(arr, from, to) {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ------------------------------------------------------------- primitives */

function Field({ label, hint, children }) {
  return (
    <label className="ad-field">
      <span className="ad-label">{label}{hint && <em>{hint}</em>}</span>
      {children}
    </label>
  );
}

function Text({ value, onChange, placeholder }) {
  return <input className="ad-input" value={value ?? ''} placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)} />;
}

function Area({ value, onChange, rows = 4 }) {
  return <textarea className="ad-input ad-area" rows={rows} value={value ?? ''}
                   onChange={(e) => onChange(e.target.value)} />;
}

function Num({ value, onChange, min, max, suffix }) {
  return (
    <span className="ad-num">
      <input className="ad-input" type="number" min={min} max={max} value={value ?? 0}
             onChange={(e) => onChange(Number(e.target.value))} />
      {suffix && <em>{suffix}</em>}
    </span>
  );
}

function Colour({ value, onChange }) {
  return (
    <span className="ad-colour">
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
      <input className="ad-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="ad-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Rows({ items, onChange, render, blank, addLabel = 'Add' }) {
  const list = items || [];
  return (
    <div className="ad-rows">
      {list.map((item, i) => (
        <div className="ad-row" key={i}>
          <div className="ad-row-tools">
            <button type="button" title="Move up" disabled={i === 0}
                    onClick={() => onChange(move(list, i, i - 1))}>↑</button>
            <button type="button" title="Move down" disabled={i === list.length - 1}
                    onClick={() => onChange(move(list, i, i + 1))}>↓</button>
            <button type="button" className="ad-del" title="Delete"
                    onClick={() => { if (confirm('Delete this entry?')) onChange(list.filter((_, j) => j !== i)); }}>×</button>
          </div>
          <div className="ad-row-body">
            {render(item, (patch) => onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}
          </div>
        </div>
      ))}
      <button type="button" className="ad-add" onClick={() => onChange([...list, structuredClone(blank)])}>
        + {addLabel}
      </button>
    </div>
  );
}

function StringList({ items, onChange, placeholder }) {
  const list = items || [];
  return (
    <div className="ad-rows">
      {list.map((v, i) => (
        <div className="ad-row ad-row-slim" key={i}>
          <div className="ad-row-tools">
            <button type="button" disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))}>↑</button>
            <button type="button" disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))}>↓</button>
            <button type="button" className="ad-del" onClick={() => onChange(list.filter((_, j) => j !== i))}>×</button>
          </div>
          <input className="ad-input" value={v} placeholder={placeholder}
                 onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
        </div>
      ))}
      <button type="button" className="ad-add" onClick={() => onChange([...list, ''])}>+ Add</button>
    </div>
  );
}

function ParaList({ items, onChange }) {
  const list = items || [];
  return (
    <div className="ad-rows">
      {list.map((v, i) => (
        <div className="ad-row" key={i}>
          <div className="ad-row-tools">
            <button type="button" disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))}>↑</button>
            <button type="button" disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))}>↓</button>
            <button type="button" className="ad-del" onClick={() => onChange(list.filter((_, j) => j !== i))}>×</button>
          </div>
          <div className="ad-row-body">
            <textarea className="ad-input ad-area" rows={4} value={v}
                      onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
          </div>
        </div>
      ))}
      <button type="button" className="ad-add" onClick={() => onChange([...list, ''])}>+ Add paragraph</button>
    </div>
  );
}

function ImagePick({ value, onChange, token, onNotify }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const r = await api.upload(token, file);
      onChange(r.url);
      onNotify('Image uploaded.', 'ok');
    } catch (err) {
      onNotify(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-image">
      {value ? <img src={value} alt="" /> : <div className="ad-image-empty">No image</div>}
      <div className="ad-image-side">
        <input className="ad-input" value={value ?? ''} placeholder="/assets/name.png or a URL"
               onChange={(e) => onChange(e.target.value)} />
        <div className="ad-image-btns">
          <button type="button" className="ad-btn" disabled={busy} onClick={() => inputRef.current.click()}>
            {busy ? 'Uploading…' : 'Upload image'}
          </button>
          {value && <button type="button" className="ad-btn ghost" onClick={() => onChange('')}>Clear</button>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ login */

function Login({ onToken, onExit }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await api.login(pw);
      onToken(r.token);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-login-wrap">
      <form className="ad-login" onSubmit={submit}>
        <h2>Dashboard</h2>
        <p>Sign in to edit the site.</p>
        <input className="ad-input" type="password" autoFocus value={pw} placeholder="Password"
               onChange={(e) => setPw(e.target.value)} />
        {err && <p className="ad-err">{err}</p>}
        <div className="ad-login-btns">
          <button className="ad-btn primary" disabled={busy || !pw}>{busy ? 'Checking…' : 'Sign in'}</button>
          <button className="ad-btn ghost" type="button" onClick={onExit}>Back to site</button>
        </div>
      </form>
    </div>
  );
}

/* ----------------------------------------------------------------- panels */

const SECTIONS = [
  ['theme', 'Appearance'],
  ['hero', 'Hero'],
  ['stats', 'Stat band'],
  ['research', 'Research'],
  ['publications', 'Publications'],
  ['software', 'Software'],
  ['experience', 'Experience'],
  ['background', 'Background'],
  ['contact', 'Contact'],
  ['nav', 'Navigation'],
  ['meta', 'Page & footer'],
];

export default function Admin({ content, setContent, onExit }) {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState('theme');
  const [note, setNote] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(false);

  const notify = (msg, kind = 'ok') => {
    setNote({ msg, kind });
    setTimeout(() => setNote(null), 4000);
  };

  const set = (path, value) => {
    setContent((c) => setPath(c, path, value));
    setDirty(true);
  };
  const get = (path) => getPath(content, path);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && hidden) setHidden(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hidden]);

  async function save() {
    setSaving(true);
    try {
      await api.saveContent(token, content);
      setDirty(false);
      notify('Saved. The live site is updated.', 'ok');
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <>
        <style>{PANEL_CSS}</style>
        <Login onToken={setToken} onExit={onExit} />
      </>
    );
  }

  if (hidden) {
    return (
      <>
        <style>{PANEL_CSS}</style>
        <button className="ad-float" onClick={() => setHidden(false)}>Back to dashboard</button>
      </>
    );
  }

  const t = content.theme;

  return (
    <>
      <style>{PANEL_CSS}</style>
      <div className="ad-shell">
        <aside className="ad-side">
          <div className="ad-brand">Dashboard</div>
          <nav className="ad-nav">
            {SECTIONS.map(([key, label]) => (
              <button key={key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label}</button>
            ))}
          </nav>
          <div className="ad-side-foot">
            <button className="ad-btn ghost" onClick={() => setHidden(true)}>Preview site</button>
            <button className="ad-btn ghost" onClick={() => {
              if (!dirty || confirm('You have unsaved changes. Leave anyway?')) onExit();
            }}>Exit</button>
          </div>
        </aside>

        <main className="ad-main">
          <header className="ad-top">
            <h1>{SECTIONS.find(([k]) => k === tab)[1]}</h1>
            <span className={'ad-state ' + (dirty ? 'dirty' : '')}>
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
            <button className="ad-btn primary" disabled={!dirty || saving} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </header>

          {note && <div className={'ad-note ' + note.kind}>{note.msg}</div>}

          <div className="ad-body">

            {tab === 'theme' && (
              <>
                <p className="ad-help">Changes show on the page behind this panel straight away. Nothing is public until you press Save.</p>
                <div className="ad-grid">
                  <Field label="Accent colour" hint="light mode"><Colour value={t.accent} onChange={(v) => set(['theme', 'accent'], v)} /></Field>
                  <Field label="Accent colour" hint="dark mode"><Colour value={t.accentDark} onChange={(v) => set(['theme', 'accentDark'], v)} /></Field>
                  <Field label="Page background"><Colour value={t.ground} onChange={(v) => set(['theme', 'ground'], v)} /></Field>
                  <Field label="Card background"><Colour value={t.surface} onChange={(v) => set(['theme', 'surface'], v)} /></Field>
                  <Field label="Text colour"><Colour value={t.ink} onChange={(v) => set(['theme', 'ink'], v)} /></Field>
                  <Field label="Secondary text"><Colour value={t.muted} onChange={(v) => set(['theme', 'muted'], v)} /></Field>
                  <Field label="Lines and borders"><Colour value={t.hair} onChange={(v) => set(['theme', 'hair'], v)} /></Field>
                </div>
                <div className="ad-grid">
                  <Field label="Heading font"><Select value={t.fontDisplay} options={FONTS.display} onChange={(v) => set(['theme', 'fontDisplay'], v)} /></Field>
                  <Field label="Body font"><Select value={t.fontBody} options={FONTS.body} onChange={(v) => set(['theme', 'fontBody'], v)} /></Field>
                  <Field label="Label font" hint="small caps and data"><Select value={t.fontMono} options={FONTS.mono} onChange={(v) => set(['theme', 'fontMono'], v)} /></Field>
                  <Field label="Body text size"><Num value={t.baseSize} min={14} max={22} suffix="px" onChange={(v) => set(['theme', 'baseSize'], v)} /></Field>
                  <Field label="Name size" hint="largest width"><Num value={t.heroSize} min={36} max={110} suffix="px" onChange={(v) => set(['theme', 'heroSize'], v)} /></Field>
                  <Field label="Heading size"><Num value={t.headingSize} min={22} max={60} suffix="px" onChange={(v) => set(['theme', 'headingSize'], v)} /></Field>
                  <Field label="Corner rounding"><Num value={t.radius} min={0} max={28} suffix="px" onChange={(v) => set(['theme', 'radius'], v)} /></Field>
                </div>
              </>
            )}

            {tab === 'hero' && (
              <>
                <Field label="Name"><Text value={content.hero.name} onChange={(v) => set(['hero', 'name'], v)} /></Field>
                <Field label="Availability line">
                  <label className="ad-check">
                    <input type="checkbox" checked={!!content.hero.showAvailable}
                           onChange={(e) => set(['hero', 'showAvailable'], e.target.checked)} />
                    <span>Show it</span>
                  </label>
                </Field>
                <Field label="Availability text"><Text value={content.hero.available} onChange={(v) => set(['hero', 'available'], v)} /></Field>
                <Field label="Intro paragraph"><Area rows={5} value={content.hero.role} onChange={(v) => set(['hero', 'role'], v)} /></Field>
                <div className="ad-grid">
                  <Field label="Linked phrase inside it" hint="must match exactly">
                    <Text value={content.hero.roleLinkText} onChange={(v) => set(['hero', 'roleLinkText'], v)} />
                  </Field>
                  <Field label="Where that phrase links">
                    <Text value={content.hero.roleLinkUrl} onChange={(v) => set(['hero', 'roleLinkUrl'], v)} />
                  </Field>
                </div>
                <Field label="Portrait">
                  <ImagePick value={content.hero.portrait} token={token} onNotify={notify}
                             onChange={(v) => set(['hero', 'portrait'], v)} />
                </Field>
                <Field label="Buttons">
                  <Rows items={content.hero.links} blank={{ label: '', url: '', primary: false }}
                        addLabel="button"
                        onChange={(v) => set(['hero', 'links'], v)}
                        render={(item, patch) => (
                          <>
                            <div className="ad-grid">
                              <Field label="Label"><Text value={item.label} onChange={(v) => patch({ label: v })} /></Field>
                              <Field label="Link"><Text value={item.url} onChange={(v) => patch({ url: v })} /></Field>
                            </div>
                            <label className="ad-check">
                              <input type="checkbox" checked={!!item.primary} onChange={(e) => patch({ primary: e.target.checked })} />
                              <span>Filled style</span>
                            </label>
                          </>
                        )} />
                </Field>
              </>
            )}

            {tab === 'stats' && (
              <>
                <p className="ad-help">The row of figures under the hero. Keep them to two or three words.</p>
                <Rows items={content.stats} blank={{ n: '', label: '' }} addLabel="figure"
                      onChange={(v) => set(['stats'], v)}
                      render={(item, patch) => (
                        <div className="ad-grid">
                          <Field label="Figure"><Text value={item.n} onChange={(v) => patch({ n: v })} /></Field>
                          <Field label="Label"><Text value={item.label} onChange={(v) => patch({ label: v })} /></Field>
                        </div>
                      )} />
              </>
            )}

            {tab === 'research' && (
              <>
                <div className="ad-grid">
                  <Field label="Eyebrow"><Text value={content.research.eyebrow} onChange={(v) => set(['research', 'eyebrow'], v)} /></Field>
                </div>
                <Field label="Heading"><Area rows={2} value={content.research.heading} onChange={(v) => set(['research', 'heading'], v)} /></Field>
                <Field label="Paragraphs"><ParaList items={content.research.paragraphs} onChange={(v) => set(['research', 'paragraphs'], v)} /></Field>
                <Field label="Topic tags"><StringList items={content.research.tags} onChange={(v) => set(['research', 'tags'], v)} placeholder="Polymer electrolytes" /></Field>
                <Field label="Figure caption heading">
                  <Text value={content.research.figuresNote} onChange={(v) => set(['research', 'figuresNote'], v)} />
                </Field>
                <Field label="Figures from your papers">
                  <Rows items={content.research.figures} blank={{ src: '', cap: '' }} addLabel="figure"
                        onChange={(v) => set(['research', 'figures'], v)}
                        render={(item, patch) => (
                          <>
                            <ImagePick value={item.src} token={token} onNotify={notify}
                                       onChange={(v) => patch({ src: v })} />
                            <Field label="Caption"><Area rows={2} value={item.cap} onChange={(v) => patch({ cap: v })} /></Field>
                          </>
                        )} />
                </Field>
                <Field label="Method columns">
                  <Rows items={content.research.methods} blank={{ title: '', text: '' }} addLabel="column"
                        onChange={(v) => set(['research', 'methods'], v)}
                        render={(item, patch) => (
                          <>
                            <Field label="Title"><Text value={item.title} onChange={(v) => patch({ title: v })} /></Field>
                            <Field label="Text"><Area value={item.text} onChange={(v) => patch({ text: v })} /></Field>
                          </>
                        )} />
                </Field>
              </>
            )}

            {tab === 'publications' && (
              <>
                <div className="ad-grid">
                  <Field label="Eyebrow"><Text value={content.publications.eyebrow} onChange={(v) => set(['publications', 'eyebrow'], v)} /></Field>
                  <Field label="Heading"><Text value={content.publications.heading} onChange={(v) => set(['publications', 'heading'], v)} /></Field>
                </div>
                <Field label="Note under the list"><Area rows={2} value={content.publications.note} onChange={(v) => set(['publications', 'note'], v)} /></Field>
                <div className="ad-grid">
                  <Field label="Linked phrase in the note"><Text value={content.publications.noteLinkText} onChange={(v) => set(['publications', 'noteLinkText'], v)} /></Field>
                  <Field label="Where it links"><Text value={content.publications.noteLinkUrl} onChange={(v) => set(['publications', 'noteLinkUrl'], v)} /></Field>
                </div>
                <Field label={`Papers (${(content.publications.items || []).length})`}>
                  <Rows items={content.publications.items} addLabel="paper"
                        blank={{ title: '', url: '', authors: '', me: 'E. Yousef', journal: '', tags: [], lead: '' }}
                        onChange={(v) => set(['publications', 'items'], v)}
                        render={(item, patch) => (
                          <>
                            <Field label="Title"><Area rows={2} value={item.title} onChange={(v) => patch({ title: v })} /></Field>
                            <Field label="Authors"><Area rows={2} value={item.authors} onChange={(v) => patch({ authors: v })} /></Field>
                            <div className="ad-grid">
                              <Field label="Your name as written" hint="gets bolded"><Text value={item.me} onChange={(v) => patch({ me: v })} /></Field>
                              <Field label="Journal"><Text value={item.journal} onChange={(v) => patch({ journal: v })} /></Field>
                              <Field label="Author note"><Text value={item.lead} placeholder="First author" onChange={(v) => patch({ lead: v })} /></Field>
                            </div>
                            <Field label="Link"><Text value={item.url} onChange={(v) => patch({ url: v })} /></Field>
                            <Field label="Small tags" hint="JIF, quartile, citations">
                              <StringList items={item.tags} onChange={(v) => patch({ tags: v })} placeholder="JIF 9.5" />
                            </Field>
                          </>
                        )} />
                </Field>
              </>
            )}

            {tab === 'software' && (
              <>
                <div className="ad-grid">
                  <Field label="Eyebrow"><Text value={content.software.eyebrow} onChange={(v) => set(['software', 'eyebrow'], v)} /></Field>
                  <Field label="Heading"><Text value={content.software.heading} onChange={(v) => set(['software', 'heading'], v)} /></Field>
                </div>
                <Field label="Intro paragraphs"><ParaList items={content.software.intro} onChange={(v) => set(['software', 'intro'], v)} /></Field>
                <Field label="Projects">
                  <Rows items={content.software.projects} addLabel="project"
                        blank={{ name: '', pills: [], ghostPills: [], desc: '', featured: { src: '', cap: '' }, thumbs: [], facts: [], links: [] }}
                        onChange={(v) => set(['software', 'projects'], v)}
                        render={(item, patch) => (
                          <>
                            <Field label="Name"><Text value={item.name} onChange={(v) => patch({ name: v })} /></Field>
                            <Field label="Description"><Area value={item.desc} onChange={(v) => patch({ desc: v })} /></Field>
                            <div className="ad-grid">
                              <Field label="Filled tags"><StringList items={item.pills} onChange={(v) => patch({ pills: v })} /></Field>
                              <Field label="Outline tags"><StringList items={item.ghostPills} onChange={(v) => patch({ ghostPills: v })} /></Field>
                            </div>
                            <Field label="Main screenshot">
                              <ImagePick value={item.featured && item.featured.src} token={token} onNotify={notify}
                                         onChange={(v) => patch({ featured: { ...(item.featured || {}), src: v } })} />
                            </Field>
                            <Field label="Main screenshot caption">
                              <Text value={item.featured && item.featured.cap}
                                    onChange={(v) => patch({ featured: { ...(item.featured || {}), cap: v } })} />
                            </Field>
                            <Field label="Thumbnails">
                              <Rows items={item.thumbs} blank={{ src: '', cap: '' }} addLabel="thumbnail"
                                    onChange={(v) => patch({ thumbs: v })}
                                    render={(th, tpatch) => (
                                      <>
                                        <ImagePick value={th.src} token={token} onNotify={notify} onChange={(v) => tpatch({ src: v })} />
                                        <Field label="Caption"><Text value={th.cap} onChange={(v) => tpatch({ cap: v })} /></Field>
                                      </>
                                    )} />
                            </Field>
                            <Field label="Facts">
                              <Rows items={item.facts} blank={{ label: '', text: '' }} addLabel="fact"
                                    onChange={(v) => patch({ facts: v })}
                                    render={(f, fpatch) => (
                                      <>
                                        <Field label="Label"><Text value={f.label} onChange={(v) => fpatch({ label: v })} /></Field>
                                        <Field label="Text"><Area value={f.text} onChange={(v) => fpatch({ text: v })} /></Field>
                                      </>
                                    )} />
                            </Field>
                            <Field label="Links">
                              <Rows items={item.links} blank={{ label: 'Repository', url: '' }} addLabel="link"
                                    onChange={(v) => patch({ links: v })}
                                    render={(l, lpatch) => (
                                      <div className="ad-grid">
                                        <Field label="Label"><Text value={l.label} onChange={(v) => lpatch({ label: v })} /></Field>
                                        <Field label="URL"><Text value={l.url} onChange={(v) => lpatch({ url: v })} /></Field>
                                      </div>
                                    )} />
                            </Field>
                          </>
                        )} />
                </Field>
                <Field label="Closing note"><Area value={content.software.shared} onChange={(v) => set(['software', 'shared'], v)} /></Field>
                <div className="ad-grid">
                  <Field label="Linked phrase"><Text value={content.software.sharedLinkText} onChange={(v) => set(['software', 'sharedLinkText'], v)} /></Field>
                  <Field label="Where it links"><Text value={content.software.sharedLinkUrl} onChange={(v) => set(['software', 'sharedLinkUrl'], v)} /></Field>
                  <Field label="Text after the link"><Text value={content.software.sharedTail} onChange={(v) => set(['software', 'sharedTail'], v)} /></Field>
                </div>
              </>
            )}

            {tab === 'experience' && (
              <>
                <div className="ad-grid">
                  <Field label="Eyebrow"><Text value={content.experience.eyebrow} onChange={(v) => set(['experience', 'eyebrow'], v)} /></Field>
                  <Field label="Heading"><Text value={content.experience.heading} onChange={(v) => set(['experience', 'heading'], v)} /></Field>
                </div>
                <Rows items={content.experience.items} addLabel="position"
                      blank={{ when: '', title: '', where: '', whereUrl: '', whereTail: '', text: '' }}
                      onChange={(v) => set(['experience', 'items'], v)}
                      render={(item, patch) => (
                        <>
                          <div className="ad-grid">
                            <Field label="Dates"><Text value={item.when} onChange={(v) => patch({ when: v })} /></Field>
                            <Field label="Role"><Text value={item.title} onChange={(v) => patch({ title: v })} /></Field>
                          </div>
                          <div className="ad-grid">
                            <Field label="Place" hint="becomes the link"><Text value={item.where} onChange={(v) => patch({ where: v })} /></Field>
                            <Field label="Link"><Text value={item.whereUrl} onChange={(v) => patch({ whereUrl: v })} /></Field>
                            <Field label="Text after it"><Text value={item.whereTail} onChange={(v) => patch({ whereTail: v })} /></Field>
                          </div>
                          <Field label="Description"><Area value={item.text} onChange={(v) => patch({ text: v })} /></Field>
                        </>
                      )} />
              </>
            )}

            {tab === 'background' && (
              <>
                <div className="ad-grid">
                  <Field label="Eyebrow"><Text value={content.background.eyebrow} onChange={(v) => set(['background', 'eyebrow'], v)} /></Field>
                  <Field label="Heading"><Text value={content.background.heading} onChange={(v) => set(['background', 'heading'], v)} /></Field>
                </div>
                <Field label="Degrees">
                  <Rows items={content.background.education} blank={{ when: '', title: '', where: '', text: '' }} addLabel="degree"
                        onChange={(v) => set(['background', 'education'], v)}
                        render={(item, patch) => (
                          <>
                            <div className="ad-grid">
                              <Field label="Dates"><Text value={item.when} onChange={(v) => patch({ when: v })} /></Field>
                              <Field label="Degree"><Text value={item.title} onChange={(v) => patch({ title: v })} /></Field>
                            </div>
                            <Field label="Institution"><Text value={item.where} onChange={(v) => patch({ where: v })} /></Field>
                            <Field label="Extra line"><Area rows={2} value={item.text} onChange={(v) => patch({ text: v })} /></Field>
                          </>
                        )} />
                </Field>
                <div className="ad-grid">
                  <Field label="Awards column title"><Text value={content.background.awardsTitle} onChange={(v) => set(['background', 'awardsTitle'], v)} /></Field>
                  <Field label="Review column title"><Text value={content.background.reviewTitle} onChange={(v) => set(['background', 'reviewTitle'], v)} /></Field>
                </div>
                <Field label="Awards">
                  <Rows items={content.background.awards} blank={{ name: '', year: '' }} addLabel="award"
                        onChange={(v) => set(['background', 'awards'], v)}
                        render={(item, patch) => (
                          <div className="ad-grid">
                            <Field label="Award"><Text value={item.name} onChange={(v) => patch({ name: v })} /></Field>
                            <Field label="Year"><Text value={item.year} onChange={(v) => patch({ year: v })} /></Field>
                          </div>
                        )} />
                </Field>
                <Field label="Journals reviewed for">
                  <Rows items={content.background.review} blank={{ name: '', year: '' }} addLabel="journal"
                        onChange={(v) => set(['background', 'review'], v)}
                        render={(item, patch) => (
                          <div className="ad-grid">
                            <Field label="Journal"><Text value={item.name} onChange={(v) => patch({ name: v })} /></Field>
                            <Field label="Year"><Text value={item.year} onChange={(v) => patch({ year: v })} /></Field>
                          </div>
                        )} />
                </Field>
                <div className="ad-grid">
                  <Field label="Leadership title"><Text value={content.background.leadershipTitle} onChange={(v) => set(['background', 'leadershipTitle'], v)} /></Field>
                </div>
                <Field label="Leadership text"><Area rows={5} value={content.background.leadership} onChange={(v) => set(['background', 'leadership'], v)} /></Field>
              </>
            )}

            {tab === 'contact' && (
              <>
                <div className="ad-grid">
                  <Field label="Eyebrow"><Text value={content.contact.eyebrow} onChange={(v) => set(['contact', 'eyebrow'], v)} /></Field>
                </div>
                <Field label="Heading"><Area rows={2} value={content.contact.heading} onChange={(v) => set(['contact', 'heading'], v)} /></Field>
                <Field label="Text"><Area rows={5} value={content.contact.text} onChange={(v) => set(['contact', 'text'], v)} /></Field>
                <Field label="Contact buttons">
                  <Rows items={content.contact.links} blank={{ label: '', url: '', primary: false }} addLabel="button"
                        onChange={(v) => set(['contact', 'links'], v)}
                        render={(item, patch) => (
                          <>
                            <div className="ad-grid">
                              <Field label="Label"><Text value={item.label} onChange={(v) => patch({ label: v })} /></Field>
                              <Field label="Link" hint="mailto: or tel: work too"><Text value={item.url} onChange={(v) => patch({ url: v })} /></Field>
                            </div>
                            <label className="ad-check">
                              <input type="checkbox" checked={!!item.primary} onChange={(e) => patch({ primary: e.target.checked })} />
                              <span>Filled style</span>
                            </label>
                          </>
                        )} />
                </Field>
                <Field label="Research groups title"><Text value={content.contact.groupsTitle} onChange={(v) => set(['contact', 'groupsTitle'], v)} /></Field>
                <Field label="Research groups">
                  <Rows items={content.contact.groups} blank={{ label: '', url: '' }} addLabel="group"
                        onChange={(v) => set(['contact', 'groups'], v)}
                        render={(item, patch) => (
                          <div className="ad-grid">
                            <Field label="Label"><Text value={item.label} onChange={(v) => patch({ label: v })} /></Field>
                            <Field label="Link"><Text value={item.url} onChange={(v) => patch({ url: v })} /></Field>
                          </div>
                        )} />
                </Field>
              </>
            )}

            {tab === 'nav' && (
              <>
                <p className="ad-help">The links in the bar at the top. Each target must match a section id on the page: research, publications, software, experience, background, contact.</p>
                <Rows items={content.nav} blank={{ label: '', href: '#' }} addLabel="link"
                      onChange={(v) => set(['nav'], v)}
                      render={(item, patch) => (
                        <div className="ad-grid">
                          <Field label="Label"><Text value={item.label} onChange={(v) => patch({ label: v })} /></Field>
                          <Field label="Target"><Text value={item.href} onChange={(v) => patch({ href: v })} /></Field>
                        </div>
                      )} />
              </>
            )}

            {tab === 'meta' && (
              <>
                <Field label="Browser tab title"><Text value={content.meta.title} onChange={(v) => set(['meta', 'title'], v)} /></Field>
                <Field label="Search description" hint="about 150 characters">
                  <Area rows={3} value={content.meta.description} onChange={(v) => set(['meta', 'description'], v)} />
                </Field>
                <div className="ad-grid">
                  <Field label="Footer left"><Text value={content.footer.left} onChange={(v) => set(['footer', 'left'], v)} /></Field>
                  <Field label="Footer right"><Text value={content.footer.right} onChange={(v) => set(['footer', 'right'], v)} /></Field>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
