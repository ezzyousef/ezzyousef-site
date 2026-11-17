import { useEffect } from 'react';
import { Zoomable, useGallery } from './Gallery.jsx';
import { A, BackToTop, Footer } from './parts.jsx';
import { TopBar } from './Site.jsx';
import { infoRows, downloadsOf, noInstallerNote, statusLabel } from '../lib/project.js';

/** One project's own page, at /software/<slug>/. Everything on it comes from
 *  the same content document the dashboard edits. */
export default function ProjectPage({ c, index }) {
  const pr = c.software.projects[index];
  const { open, dialog } = useGallery();

  useEffect(() => {
    document.title = `${pr.name} · ${c.hero.name}`;
    const d = document.querySelector('meta[name="description"]');
    if (d && pr.desc) d.setAttribute('content', pr.desc.slice(0, 160));
  }, [pr.name, pr.desc, c.hero.name]);

  const group = [pr.featured, ...(pr.thumbs || [])].filter((x) => x && x.src);
  const rows = infoRows(pr);
  const dls = downloadsOf(pr);
  const links = [
    ...(pr.links || []),
    pr.docsUrl ? { label: 'Documentation', url: pr.docsUrl } : null,
    pr.changelogUrl ? { label: 'Changelog', url: pr.changelogUrl } : null,
  ].filter((l) => l && l.url);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <TopBar c={c} active="software" home="/" />

      <main id="main" className="page project-page">
        <p className="crumb"><a href="/#software">← All software</a></p>
        <header className="project-head">
          <h1>{pr.name}</h1>
          <div className="proj-head">
            {[...(pr.pills || []), ...(pr.ghostPills || [])].map((p, j) => (
              <span className="proj-kind" key={j}>{p}</span>
            ))}
            {statusLabel(pr.status) && <span className="proj-kind proj-status">{statusLabel(pr.status)}</span>}
          </div>
          <p className="lede">{pr.desc}</p>
        </header>

        <div className="proj-split">
          <div>
            {(pr.detail || []).map((p, i) => <p key={i}>{p}</p>)}
            {(pr.facts || []).length > 0 && (
              <ul className="facts">
                {pr.facts.map((f, j) => <li key={j}><b>{f.label}</b><span>{f.text}</span></li>)}
              </ul>
            )}
          </div>
          <aside aria-label="Release information">
            {rows.length > 0 && (
              <dl className="info">
                {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            )}
            <h2 className="col-h">Downloads</h2>
            {dls.length > 0 ? (
              <ul className="plain">
                {dls.map((d, j) => (
                  <li key={j}><A href={d.url}>{d.label || 'Download'}</A><span className="yr">{d.platform}</span></li>
                ))}
              </ul>
            ) : <p className="proj-note">{noInstallerNote(pr)}</p>}
            {links.length > 0 && (
              <div className="proj-links">
                {links.map((l, j) => <A key={j} href={l.url}>{l.label}</A>)}
              </div>
            )}
          </aside>
        </div>

        {group.length > 0 && (
          <section aria-label="Screenshots" className="project-shots">
            <div className="plates">
              {group.map((g, j) => (
                <Zoomable key={j} item={g} group={group} index={j} onOpen={open} className="shot"
                          sizes="(max-width: 800px) 45vw, 22vw" />
              ))}
            </div>
          </section>
        )}
      </main>

      <BackToTop />
      <Footer c={c} />
      {dialog}
    </>
  );
}
