import { useEffect, useMemo, useState } from 'react';
import Picture from './Picture.jsx';
import { Zoomable, useGallery, tilt } from './Gallery.jsx';
import { A, Linked, Rail, BackToTop, Footer, linkLabel } from './parts.jsx';
import { citationText, toBibtex, matches, doiOf } from '../lib/citation.js';
import { projectSlugs, projectPath, slugify } from '../lib/slug.js';
import { statusLabel, downloadsOf, noInstallerNote } from '../lib/project.js';

/** Bolds the person's own name inside an author string. */
function Authors({ authors, me }) {
  if (!me || !authors || !authors.includes(me)) return <>{authors}</>;
  const parts = authors.split(me);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="me">{me}</span>}
        </span>
      ))}
    </>
  );
}

function CopyCitation({ pub }) {
  const [state, setState] = useState('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(citationText(pub));
      setState('done');
    } catch {
      setState('manual');
    }
    setTimeout(() => setState('idle'), 2500);
  };
  return (
    <>
      <button type="button" className="cite" onClick={copy}>
        cite<span className="sr"> {pub.title}</span>
      </button>
      <span className="sr" role="status">{state === 'done' ? 'Citation copied' : state === 'manual' ? 'Copy failed; select the text instead' : ''}</span>
      {state !== 'idle' && <span aria-hidden="true">{state === 'done' ? 'copied' : 'copy failed'}</span>}
    </>
  );
}

/** Offers a text file to save, built in the browser; nothing is uploaded. */
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Publications({ c }) {
  const pubs = useMemo(() => c.publications.items || [], [c.publications.items]);
  const [onlyFirst, setOnlyFirst] = useState(false);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');

  const isFirst = (p) => (p.lead || '').toLowerCase().includes('first');
  const firstCount = useMemo(() => pubs.filter(isFirst).length, [pubs]);
  const years = useMemo(() => [...new Set(pubs.map((p) => String(p.year || '')).filter(Boolean))].sort().reverse(), [pubs]);
  const shown = pubs.filter((p) => (!onlyFirst || isFirst(p)) && (!year || String(p.year) === year) && matches(p, query));
  const filtering = onlyFirst || year || query.trim();

  return (
    <section id="publications" className="page">
      <div className="band">
        <Rail n={2} label="Publications" href="#publications" />
        <div>
          <h2>{c.publications.heading}</h2>

          {pubs.length > 3 && (
            <div className="pub-tools">
              <label className="search">
                <span className="sr">Search publications</span>
                <input type="search" value={query} placeholder="Search titles, authors, journals"
                       onChange={(e) => setQuery(e.target.value)} />
              </label>
              {firstCount > 0 && pubs.length > firstCount && (
                <div className="filters" role="group" aria-label="Filter publications">
                  <button type="button" className={!onlyFirst ? 'on' : ''}
                          aria-pressed={!onlyFirst} onClick={() => setOnlyFirst(false)}>
                    All {pubs.length}
                  </button>
                  <button type="button" className={onlyFirst ? 'on' : ''}
                          aria-pressed={onlyFirst} onClick={() => setOnlyFirst(true)}>
                    First author {firstCount}
                  </button>
                </div>
              )}
              {years.length > 1 && (
                <label className="year">
                  <span className="sr">Year</span>
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">All years</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              )}
              <button type="button" className="bib"
                      onClick={() => download('publications.bib', toBibtex(shown), 'application/x-bibtex')}>
                BibTeX{filtering ? ` (${shown.length})` : ''}
              </button>
            </div>
          )}
          <p className="sr" role="status">{filtering ? `${shown.length} of ${pubs.length} publications shown` : ''}</p>

          <ol className="pubs">
            {shown.map((p, i) => {
              const doi = doiOf(p);
              const href = p.url || (doi ? `https://doi.org/${doi}` : '');
              return (
                <li className="pub" key={p.title || i}>
                  <div className="pub-t">{href ? <A href={href}>{p.title}</A> : p.title}</div>
                  <div className="pub-a"><Authors authors={p.authors} me={p.me} /></div>
                  <div className="pub-m">
                    {p.journal && <em className="pub-j">{p.journal}</em>}
                    {p.year && <span>{p.year}</span>}
                    {(p.tags || []).map((t, j) => <span key={j}>{t}</span>)}
                    {p.lead && <span className="lead">{p.lead}</span>}
                    <span className="cite-wrap"><CopyCitation pub={p} /></span>
                  </div>
                </li>
              );
            })}
          </ol>
          {shown.length === 0 && <p className="note">No publication matches that search.</p>}
          {c.publications.note && (
            <p className="note">
              <Linked text={c.publications.note} phrase={c.publications.noteLinkText}
                      url={c.publications.noteLinkUrl} />
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ pr, slug, onOpen }) {
  const group = [pr.featured, ...(pr.thumbs || [])].filter((x) => x && x.src);
  const status = statusLabel(pr.status);
  const dls = downloadsOf(pr);
  return (
    <article className="proj tilt" {...tilt(3, 4)} aria-labelledby={`proj-${slug}`}>
      <div className="band band-flush">
        <div className="rail" />
        <div>
          <div className="proj-head">
            <h3 id={`proj-${slug}`}><a href={projectPath(slug)}>{pr.name}</a></h3>
            {[...(pr.pills || []), ...(pr.ghostPills || [])].map((p, j) => (
              <span className="proj-kind" key={j}>{p}</span>
            ))}
            {status && <span className="proj-kind proj-status">{status}{pr.version ? ` · ${pr.version}` : ''}</span>}
          </div>
          <div className="proj-split">
            <p>{pr.desc}</p>
            {(pr.facts || []).length > 0 && (
              <ul className="facts">
                {pr.facts.map((f, j) => (
                  <li key={j}><b>{f.label}</b><span>{f.text}</span></li>
                ))}
              </ul>
            )}
          </div>

          {group.length > 0 && (
            <div className="plates">
              {group.map((g, j) => (
                <Zoomable key={j} item={g} group={group} index={j} onOpen={onOpen} className="shot"
                          sizes="(max-width: 800px) 45vw, 22vw" />
              ))}
            </div>
          )}

          <div className="proj-links">
            <a href={projectPath(slug)}>Details<span className="sr"> about {pr.name}</span></a>
            {dls.map((d, j) => <A key={`d${j}`} href={d.url}>{d.label || 'Download'}{d.platform ? ` (${d.platform})` : ''}</A>)}
            {(pr.links || []).map((l, j) => <A key={j} href={l.url}>{l.label}</A>)}
          </div>
          {!dls.length && <p className="proj-note">{noInstallerNote(pr)}</p>}
        </div>
      </div>
    </article>
  );
}

function Blocks({ c, start }) {
  return (c.blocks || []).filter((b) => b && b.title).map((b, i) => {
    const id = b.id || slugify(b.title);
    return (
      <section id={id} className="page" key={id}>
        <div className="band">
          <Rail n={start + i} label={b.eyebrow || b.title} href={`#${id}`} />
          <div>
            <h2>{b.title}</h2>
            {(b.paragraphs || []).map((p, j) => <p key={j}>{p}</p>)}
            {(b.links || []).length > 0 && (
              <div className="proj-links">
                {b.links.map((l, j) => <A key={j} href={l.url}>{linkLabel(l)}</A>)}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  });
}

export function TopBar({ c, active, home = '' }) {
  return (
    <nav className="topbar" aria-label="Sections">
      <div className="topbar-in">
        <div className="topbar-scroll">
          {(c.nav || []).map((n) => (
            <a key={n.href} href={home + n.href}
               aria-current={active === n.href.replace('#', '') ? 'true' : undefined}>
              {n.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default function Site({ c }) {
  const [active, setActive] = useState('');
  const { open, dialog } = useGallery();

  useEffect(() => {
    const ids = (c.nav || []).map((n) => n.href.replace('#', ''));
    const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!nodes.length || !('IntersectionObserver' in window)) return undefined;
    const seen = {};
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { seen[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
        let best = '', bestV = 0;
        nodes.forEach((n) => { const v = seen[n.id] || 0; if (v > bestV) { bestV = v; best = n.id; } });
        if (best) setActive(best);
      },
      { rootMargin: '-56px 0px -60% 0px', threshold: [0, 0.1, 0.35, 0.7, 1] }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [c.nav]);

  const figures = c.research.figures || [];
  const slugs = projectSlugs(c.software.projects);
  const blocks = (c.blocks || []).filter((b) => b && b.title);
  const profile = c.profile || {};

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <TopBar c={c} active={active} />

      <header className="opener page" id="top">
        <div className="opener-in">
          <div>
            {c.hero.portrait && (
              <Picture className="plate" src={c.hero.portrait} eager
                       sizes="(max-width: 760px) 116px, 168px"
                       alt={`Portrait of ${c.hero.name}`} />
            )}
          </div>
          <div>
            {c.hero.showAvailable && c.hero.available && (
              <span className="status">{c.hero.available}</span>
            )}
            <h1>{c.hero.name}</h1>
            <p className="lede">
              <Linked text={c.hero.role} phrase={c.hero.roleLinkText} url={c.hero.roleLinkUrl} />
            </p>

            {(c.stats || []).length > 0 && (
              <div className="facts-line">
                {c.stats.map((s, i) => (
                  <span key={i}><b>{s.n}</b> {String(s.label || '').toLowerCase()}</span>
                ))}
              </div>
            )}

            <div className="actions">
              {(c.hero.links || []).map((l, i) => (
                <A key={i} className={l.primary ? 'lead' : ''} href={l.url}>{linkLabel(l)}</A>
              ))}
              {profile.cvUrl && <A href={profile.cvUrl}>CV</A>}
              {profile.orcid && <A href={`https://orcid.org/${profile.orcid}`}>ORCID</A>}
            </div>
          </div>
        </div>
      </header>

      <main id="main">

        <section id="research" className="page">
          <div className="band">
            <Rail n={1} label={c.research.eyebrow} href="#research" />
            <div>
              <h2>{c.research.heading}</h2>
              {(c.research.paragraphs || []).map((p, i) => <p key={i}>{p}</p>)}
              {(c.research.tags || []).length > 0 && (
                <ul className="inline-list">
                  {c.research.tags.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
              {figures.length > 0 && (
                <>
                  {c.research.figuresNote && <p className="fignote">{c.research.figuresNote}</p>}
                  <div className="figrow">
                    {figures.map((f, i) => (
                      <Zoomable key={i} item={f} group={figures} index={i} onOpen={open}
                                sizes="(max-width: 700px) 92vw, 30vw" />
                    ))}
                  </div>
                </>
              )}
              {(c.research.methods || []).length > 0 && (
                <div className="cols">
                  {c.research.methods.map((m, i) => (
                    <div key={i}>
                      <h3 className="col-h">{m.title}</h3>
                      <p className="col-t">{m.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <Publications c={c} />

        <section id="software" className="page">
          <div className="band">
            <Rail n={3} label="Software" href="#software" />
            <div>
              <h2>{c.software.heading}</h2>
              {(c.software.intro || []).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>

          {(c.software.projects || []).map((pr, i) => (
            <ProjectCard key={slugs[i]} pr={pr} slug={slugs[i]} onOpen={open} />
          ))}

          {c.software.shared && (
            <div className="band band-flush">
              <div className="rail" />
              <p className="footnote">
                <b>{c.software.shared.split(',')[0]}</b>
                {c.software.shared.slice(c.software.shared.split(',')[0].length)}{' '}
                {c.software.sharedLinkText && (
                  <>
                    <A href={c.software.sharedLinkUrl}>{c.software.sharedLinkText}</A>{' '}
                    {c.software.sharedTail}
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        <section id="experience" className="page">
          <div className="band">
            <Rail n={4} label="Experience" href="#experience" />
            <div>
              <h2>{c.experience.heading}</h2>
              <ul className="tl">
                {(c.experience.items || []).map((e, i) => (
                  <li key={i}>
                    <span className="when">{e.when}</span>
                    <div className="what">
                      <h3>{e.title}</h3>
                      <span className="where">
                        {e.whereUrl ? <A href={e.whereUrl}>{e.where}</A> : e.where}
                        {e.whereTail}
                      </span>
                      {e.text && <p>{e.text}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="background" className="page">
          <div className="band">
            <Rail n={5} label="Background" href="#background" />
            <div>
              <h2>{c.background.heading}</h2>
              <ul className="tl">
                {(c.background.education || []).map((e, i) => (
                  <li key={i}>
                    <span className="when">{e.when}</span>
                    <div className="what">
                      <h3>{e.title}</h3>
                      <span className="where">{e.where}</span>
                      {e.text && <p>{e.text}</p>}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="pair">
                <div>
                  <h3 className="col-h">{c.background.awardsTitle}</h3>
                  <ul className="plain">
                    {(c.background.awards || []).map((a, i) => (
                      <li key={i}>{a.name}<span className="yr">{a.year}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="col-h">{c.background.reviewTitle}</h3>
                  <ul className="plain">
                    {(c.background.review || []).map((a, i) => (
                      <li key={i}>{a.name}<span className="yr">{a.year}</span></li>
                    ))}
                  </ul>
                </div>
              </div>

              {c.background.leadership && (
                <div className="leadership">
                  <h3 className="col-h">{c.background.leadershipTitle}</h3>
                  <p>{c.background.leadership}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <Blocks c={c} start={6} />

      </main>

      <div className="closing" id="contact">
        <div className="closing-in">
          <div className="band">
            <Rail n={6 + blocks.length} label={c.contact.eyebrow} href="#contact" />
            <div>
              <h2>{c.contact.heading}</h2>
              <p>{c.contact.text}</p>
              <div className="actions actions-contact">
                {(c.contact.links || []).map((l, i) => (
                  <A key={i} className={l.primary ? 'lead' : ''} href={l.url}>{linkLabel(l)}</A>
                ))}
              </div>
              {(c.contact.groups || []).length > 0 && (
                <>
                  <h3 className="col-h groups-h">{c.contact.groupsTitle}</h3>
                  <div className="groups">
                    {c.contact.groups.map((g, i) => <A key={i} href={g.url}>{g.label}</A>)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <BackToTop />
      <Footer c={c} />
      {dialog}
    </>
  );
}
