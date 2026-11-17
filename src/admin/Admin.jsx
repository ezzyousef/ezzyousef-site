import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { HOSTED_FONTS as FONTS } from '../theme.js';
import { checkContent } from '../lib/a11y-check.js';
import { validate, migrate, PROJECT_STATUSES } from '../lib/content-schema.js';
import { stillDirty, publishMessage, withLiveRevision } from '../lib/publish-state.js';
import { lookupDoi, lookupOrcidDois, diffPub, applyFields, missingDois, isOrcid } from '../lib/crossref.js';
import { doiOf } from '../lib/citation.js';
import { parseBackup, backupName } from '../lib/backup.js';
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
            <button type="button" title="Move up" aria-label={`Move entry ${i + 1} up`} disabled={i === 0}
                    onClick={() => onChange(move(list, i, i - 1))}>↑</button>
            <button type="button" title="Move down" aria-label={`Move entry ${i + 1} down`} disabled={i === list.length - 1}
                    onClick={() => onChange(move(list, i, i + 1))}>↓</button>
            <button type="button" className="ad-del" title="Delete" aria-label={`Delete entry ${i + 1}`}
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
            <button type="button" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))}>↑</button>
            <button type="button" aria-label={`Move item ${i + 1} down`} disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))}>↓</button>
            <button type="button" className="ad-del" aria-label={`Delete item ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>×</button>
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
            <button type="button" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))}>↑</button>
            <button type="button" aria-label={`Move item ${i + 1} down`} disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))}>↓</button>
            <button type="button" className="ad-del" aria-label={`Delete item ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>×</button>
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
      const saved = r.savedBytes ? `, ${Math.round(r.savedBytes / 1024)} KB smaller` : '';
      onNotify(`Image uploaded${saved}.`, 'ok');
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
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={pick} />
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
        <input className="ad-input" type="password" aria-label="Password" autoFocus value={pw} placeholder="Password"
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
  ['blocks', 'Extra sections'],
  ['checks', 'Checks'],
  ['history', 'History & backup'],
];

const RENEW_EVERY_MS = 20 * 60 * 1000;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : 'never');

export default function Admin({ content, setContent, onExit }) {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState('theme');
  const [note, setNote] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [versions, setVersions] = useState(null);
  const [draftAt, setDraftAt] = useState(null);
  const [review, setReview] = useState(null);
  const [lookup, setLookup] = useState({ doi: '', orcid: '', busy: false, missing: [] });
  const importRef = useRef(null);
  const editRev = useRef(0);        // bumps on every edit, to tell what a save covered
  const retryTimer = useRef(null);

  const notify = (msg, kind = 'ok') => {
    setNote({ msg, kind });
    setTimeout(() => setNote(null), kind === 'bad' ? 9000 : 5000);
  };

  const set = (path, value) => {
    editRev.current += 1;
    setContent((c) => setPath(c, path, value));
    setDirty(true);
  };

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

  useEffect(() => {
    if (!token) return undefined;
    const id = setInterval(async () => {
      try {
        const r = await api.renew(token);
        setToken(r.token);
      } catch {
        setToken('');
      }
    }, RENEW_EVERY_MS);
    return () => clearInterval(id);
  }, [token]);

  async function save(stage) {
    if (stage === 'publish') {
      const problems = validate(content);
      if (problems.length) {
        notify(`Fix first: ${problems[0].path}: ${problems[0].message}`, 'bad');
        setTab('checks');
        return;
      }
      const warns = checkContent(content).filter((c) => c.level === 'warn');
      if (warns.length && !confirm(`${warns.length} accessibility warning(s) in the Checks tab. Publish anyway?`)) return;
    }
    setSaving(true);
    const submitted = editRev.current;
    try {
      const r = await api.saveContent(token, content, stage, content.revision || 0);
      if (stage === 'draft') {
        setDraftAt(r.savedAt);
        notify('Draft saved. The live site is unchanged.', 'ok');
      } else {
        // The server numbered this publish; later edits must build on it.
        setContent((c) => ({ ...c, revision: r.revision }));
        setDirty(stillDirty(submitted, editRev.current));
        setVersions(null);
        const m = publishMessage(r.rebuild);
        notify(m.msg, m.kind);
        if (m.retryMs) scheduleRebuildRetry(m.retryMs);
      }
    } catch (e) {
      const detail = e.problems && e.problems.length ? ` (${e.problems[0].path}: ${e.problems[0].message})` : '';
      notify(e.message + detail, 'bad');
    } finally {
      setSaving(false);
    }
  }

  function scheduleRebuildRetry(ms) {
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(async () => {
      try {
        const r = await api.rebuild(token);
        const st = r.rebuild && r.rebuild.status;
        if (st === 'requested') notify('The pending site rebuild was requested.', 'ok');
        else if (st === 'pending') scheduleRebuildRetry(Math.max(5, Number(r.rebuild.retryAfter) || 60) * 1000);
        else if (st === 'failed') notify(`The pending site rebuild failed (${r.rebuild.message}).`, 'bad');
      } catch (e) { notify(`Could not retry the site rebuild: ${e.message}`, 'bad'); }
    }, ms);
  }

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  function load(next, label) {
    const doc = migrate(next);
    const problems = validate(doc);
    if (problems.length) return notify(`${label} is not usable: ${problems[0].path}: ${problems[0].message}`, 'bad');
    if (dirty && !confirm('This replaces the edits on screen. Continue?')) return;
    editRev.current += 1;
    setContent((c) => withLiveRevision(doc, c));
    setDirty(true);
    notify(`${label} loaded. Press Save draft or Publish to keep it.`, 'ok');
  }

  async function loadDraft() {
    try {
      const r = await api.getDraft(token);
      if (!r.draft) return notify('There is no saved draft.', 'bad');
      load(r.draft, 'Draft');
    } catch (e) { notify(e.message, 'bad'); }
  }

  async function loadHistory() {
    try { setVersions((await api.getHistory(token)).versions); } catch (e) { notify(e.message, 'bad'); }
  }

  async function loadVersion(v) {
    try { load((await api.getVersion(token, v.id)).content, `Version of ${fmt(v.savedAt)}`); } catch (e) { notify(e.message, 'bad'); }
  }

  function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupName();
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const r = parseBackup(await file.text());
    if (r.error) return notify(r.error, 'bad');
    load(r.content, 'Imported file');
  }

  const papers = (content.publications && content.publications.items) || [];

  async function findDoi() {
    setLookup((l) => ({ ...l, busy: true }));
    try {
      const proposed = await lookupDoi(lookup.doi);
      const idx = papers.findIndex((p) => doiOf(p).toLowerCase() === proposed.doi.toLowerCase());
      const current = idx >= 0 ? papers[idx] : null;
      setReview({ idx, proposed, diffs: diffPub(current, proposed), ticked: [] });
    } catch (err) { notify(err.message, 'bad'); }
    setLookup((l) => ({ ...l, busy: false }));
  }

  async function importOrcid() {
    const id = (lookup.orcid || (content.profile && content.profile.orcid) || '').trim();
    if (!isOrcid(id)) return notify('Enter a valid ORCID iD (0000-0000-0000-0000).', 'bad');
    setLookup((l) => ({ ...l, busy: true }));
    try {
      const missing = missingDois(await lookupOrcidDois(id), papers, doiOf);
      setLookup((l) => ({ ...l, missing }));
      notify(missing.length ? `${missing.length} DOI(s) on ORCID are not on the page. Look each up to review it.` : 'Every DOI on that ORCID record is already listed.', 'ok');
    } catch (err) { notify(err.message, 'bad'); }
    setLookup((l) => ({ ...l, busy: false }));
  }

  function acceptReview() {
    const { idx, proposed, ticked } = review;
    const base = idx >= 0 ? papers[idx] : { title: '', url: '', authors: '', me: 'E. Yousef', journal: '', tags: [], lead: '' };
    const next = applyFields(base, proposed, ticked);
    set(['publications', 'items'], idx >= 0 ? papers.map((p, i) => (i === idx ? next : p)) : [...papers, next]);
    setReview(null);
    notify('Applied the ticked fields. Check the paper, then save.', 'ok');
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
              <button key={key} className={tab === key ? 'on' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}</button>
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
            <span className="ad-state" title="Version of the site you are running">
              build {typeof __BUILD__ === 'string' ? __BUILD__ : '?'}
            </span>
            <button className="ad-btn" disabled={saving} onClick={() => save('draft')}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button className="ad-btn primary" disabled={saving} onClick={() => save('publish')}>
              Publish
            </button>
          </header>

          {note && <div role="status" className={'ad-note ' + note.kind}>{note.msg}</div>}

          <div className="ad-body">

            {tab === 'theme' && (
              <>
                <p className="ad-help">Changes show on the page behind this panel straight away. Nothing is public until you press Publish.</p>
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
                <section className="ad-help" aria-label="Look up a paper by DOI or ORCID">
                  <div className="ad-grid">
                    <Field label="Look up a DOI" hint="Crossref; you review before anything changes">
                      <Text value={lookup.doi} placeholder="10.1000/xyz123" onChange={(v) => setLookup((l) => ({ ...l, doi: v }))} />
                    </Field>
                    <Field label="Import from ORCID" hint="lists DOIs not yet on the page">
                      <Text value={lookup.orcid} placeholder={(content.profile && content.profile.orcid) || '0000-0000-0000-0000'} onChange={(v) => setLookup((l) => ({ ...l, orcid: v }))} />
                    </Field>
                  </div>
                  <button type="button" className="ad-btn" disabled={lookup.busy || !lookup.doi} onClick={findDoi}>Look up DOI</button>{' '}
                  <button type="button" className="ad-btn" disabled={lookup.busy} onClick={importOrcid}>Check ORCID</button>
                  {lookup.missing.length > 0 && (
                    <ul>{lookup.missing.map((d) => (
                      <li key={d}>{d} <button type="button" className="ad-btn ghost" onClick={() => setLookup((l) => ({ ...l, doi: d }))}>Use this DOI</button></li>
                    ))}</ul>
                  )}
                  {review && (
                    <div role="group" aria-label="Review proposed changes">
                      <p><strong>{review.idx >= 0 ? `Matches paper ${review.idx + 1}.` : 'Not on the page yet; it would be added as a new paper.'} Tick the fields to apply. Nothing is applied until you press Apply.</strong></p>
                      {review.diffs.length === 0 && <p>No differences.</p>}
                      {review.diffs.map((d) => (
                        <label key={d.field} style={{ display: 'block', margin: '6px 0' }}>
                          <input type="checkbox" checked={review.ticked.includes(d.field)}
                                 onChange={(e) => setReview((r) => ({ ...r, ticked: e.target.checked ? [...r.ticked, d.field] : r.ticked.filter((x) => x !== d.field) }))} />
                          {' '}<strong>{d.field}</strong>: {d.from ? <s>{d.from}</s> : <em>empty</em>} {'→'} {d.to}
                        </label>
                      ))}
                      <button type="button" className="ad-btn primary" disabled={!review.ticked.length} onClick={acceptReview}>Apply ticked fields</button>{' '}
                      <button type="button" className="ad-btn ghost" onClick={() => setReview(null)}>Cancel</button>
                    </div>
                  )}
                </section>
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
                            <div className="ad-grid">
                              <Field label="DOI"><Text value={item.doi} placeholder="10.1000/xyz123" onChange={(v) => patch({ doi: v })} /></Field>
                              <Field label="Year"><Text value={item.year} onChange={(v) => patch({ year: v })} /></Field>
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
                        blank={{ name: '', status: '', platforms: [], version: '', channel: '', license: '', docsUrl: '', changelogUrl: '', downloads: [], detail: [], pills: [], ghostPills: [], desc: '', featured: { src: '', cap: '' }, thumbs: [], facts: [], links: [] }}
                        onChange={(v) => set(['software', 'projects'], v)}
                        render={(item, patch) => (
                          <>
                            <Field label="Name"><Text value={item.name} onChange={(v) => patch({ name: v })} /></Field>
                            <div className="ad-grid">
                              <Field label="Status" hint="shown on the card; leave empty if unsure">
                                <Select value={item.status} options={PROJECT_STATUSES} onChange={(v) => patch({ status: v })} />
                              </Field>
                              <Field label="Version"><Text value={item.version} onChange={(v) => patch({ version: v })} /></Field>
                              <Field label="Release channel"><Text value={item.channel} placeholder="stable, beta" onChange={(v) => patch({ channel: v })} /></Field>
                              <Field label="License"><Text value={item.license} onChange={(v) => patch({ license: v })} /></Field>
                              <Field label="Documentation link"><Text value={item.docsUrl} onChange={(v) => patch({ docsUrl: v })} /></Field>
                              <Field label="Changelog link"><Text value={item.changelogUrl} onChange={(v) => patch({ changelogUrl: v })} /></Field>
                            </div>
                            <Field label="Platforms"><StringList items={item.platforms} placeholder="Windows, macOS, Linux" onChange={(v) => patch({ platforms: v })} /></Field>
                            <Field label="Downloads" hint="only links that exist">
                              <Rows items={item.downloads} blank={{ label: '', url: '', platform: '' }} addLabel="download"
                                    onChange={(v) => patch({ downloads: v })}
                                    render={(d, dpatch) => (
                                      <div className="ad-grid">
                                        <Field label="Label"><Text value={d.label} onChange={(v) => dpatch({ label: v })} /></Field>
                                        <Field label="URL"><Text value={d.url} onChange={(v) => dpatch({ url: v })} /></Field>
                                        <Field label="Platform"><Text value={d.platform} onChange={(v) => dpatch({ platform: v })} /></Field>
                                      </div>
                                    )} />
                            </Field>
                            <Field label="Project page text" hint="paragraphs for its own page"><ParaList items={item.detail} onChange={(v) => patch({ detail: v })} /></Field>
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
                  <Field label="ORCID iD" hint="0000-0000-0000-0000"><Text value={content.profile && content.profile.orcid} onChange={(v) => set(['profile', 'orcid'], v)} /></Field>
                  <Field label="CV link" hint="a PDF you host or link"><Text value={content.profile && content.profile.cvUrl} onChange={(v) => set(['profile', 'cvUrl'], v)} /></Field>
                </div>
                <div className="ad-grid">
                  <Field label="Footer left"><Text value={content.footer.left} onChange={(v) => set(['footer', 'left'], v)} /></Field>
                  <Field label="Footer right"><Text value={content.footer.right} onChange={(v) => set(['footer', 'right'], v)} /></Field>
                </div>
              </>
            )}

            {tab === 'blocks' && (
              <>
                <p className="ad-help">Extra sections appear after the main ones, for talks, teaching, collaboration or anything else. Each needs a title.</p>
                <Rows items={content.blocks} addLabel="section"
                      blank={{ title: '', eyebrow: '', paragraphs: [], links: [] }}
                      onChange={(v) => set(['blocks'], v)}
                      render={(b, patch) => (
                        <>
                          <div className="ad-grid">
                            <Field label="Title"><Text value={b.title} onChange={(v) => patch({ title: v })} /></Field>
                            <Field label="Small label"><Text value={b.eyebrow} onChange={(v) => patch({ eyebrow: v })} /></Field>
                          </div>
                          <Field label="Paragraphs"><ParaList items={b.paragraphs} onChange={(v) => patch({ paragraphs: v })} /></Field>
                          <Field label="Links">
                            <Rows items={b.links} blank={{ label: '', url: '' }} addLabel="link" onChange={(v) => patch({ links: v })}
                                  render={(l, lpatch) => (
                                    <div className="ad-grid">
                                      <Field label="Label"><Text value={l.label} onChange={(v) => lpatch({ label: v })} /></Field>
                                      <Field label="URL"><Text value={l.url} onChange={(v) => lpatch({ url: v })} /></Field>
                                    </div>
                                  )} />
                          </Field>
                        </>
                      )} />
              </>
            )}

            {tab === 'checks' && (() => {
              const problems = validate(content);
              const warns = checkContent(content);
              return (
                <>
                  <p className="ad-help">Problems block publishing. Warnings do not, but each one is something a visitor or screen reader would notice.</p>
                  <h2>Problems ({problems.length})</h2>
                  {problems.length === 0 ? <p>None.</p> : <ul>{problems.map((p, i) => <li key={i}>{p.path}: {p.message}</li>)}</ul>}
                  <h2>Warnings and notes ({warns.length})</h2>
                  {warns.length === 0 ? <p>None.</p> : <ul>{warns.map((w, i) => <li key={i}><strong>{w.level === 'warn' ? 'Warning' : 'Note'}</strong> · {w.where}: {w.message}</li>)}</ul>}
                </>
              );
            })()}

            {tab === 'history' && (
              <>
                <p className="ad-help">Every publish archives the previous live copy; the latest 30 are kept. Loading one only puts it on screen; nothing changes until you publish.</p>
                <p>Saved draft: {fmt(draftAt)}. <button type="button" className="ad-btn" onClick={loadDraft}>Load saved draft</button></p>
                <h2>Earlier versions</h2>
                {versions === null
                  ? <button type="button" className="ad-btn" onClick={loadHistory}>Show earlier versions</button>
                  : versions.length === 0 ? <p>No earlier versions yet.</p>
                    : <ul>{versions.map((v) => (
                      <li key={v.id}>{fmt(v.savedAt)} ({Math.round(v.size / 1024)} KB) <button type="button" className="ad-btn" onClick={() => loadVersion(v)}>Load this version</button></li>
                    ))}</ul>}
                <h2>Backup file</h2>
                <p>Keep a copy on your computer, or restore one.</p>
                <button type="button" className="ad-btn" onClick={exportJson}>Export JSON</button>{' '}
                <button type="button" className="ad-btn" onClick={() => importRef.current.click()}>Import JSON</button>
                <input ref={importRef} type="file" accept="application/json,.json" hidden aria-label="Import a content backup" onChange={importJson} />
              </>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
