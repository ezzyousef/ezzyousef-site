import { useEffect, useRef, useState } from 'react';

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

/** Splits a sentence around a phrase and links that phrase. */
function Linked({ text, phrase, url }) {
  if (!phrase || !url || !text || !text.includes(phrase)) return <>{text}</>;
  const [before, ...rest] = text.split(phrase);
  return (
    <>
      {before}
      <a href={url} target="_blank" rel="noopener">{phrase}</a>
      {rest.join(phrase)}
    </>
  );
}

function Plate({ src, cap, onOpen }) {
  if (!src) return null;
  return (
    <figure>
      <img className="shot" src={src} alt={cap || ''} loading="lazy" decoding="async"
           onClick={() => onOpen({ src, cap })} />
      {cap && <figcaption>{cap}</figcaption>}
    </figure>
  );
}

/** The margin column that carries a section's number and label. */
function Rail({ n, label }) {
  return (
    <div className="rail">
      <span className="rail-num">{String(n).padStart(2, '0')}</span>
      <span className="rail-lab">{label}</span>
    </div>
  );
}

export default function Site({ c }) {
  const [zoom, setZoom] = useState(null);
  const [active, setActive] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (zoom && !d.open) d.showModal();
    if (!zoom && d.open) d.close();
  }, [zoom]);

  useEffect(() => {
    const ids = (c.nav || []).map((n) => n.href.replace('#', ''));
    const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!nodes.length || !('IntersectionObserver' in window)) return;
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

  const open = (img) => setZoom(img);
  const ext = (u) => (u || '').startsWith('http');

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>

      <nav className="topbar" aria-label="Sections">
        <div className="topbar-in">
          <div className="topbar-scroll">
            {(c.nav || []).map((n) => (
              <a key={n.href} href={n.href}
                 aria-current={active === n.href.replace('#', '') ? 'true' : 'false'}>
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <header className="opener page" id="top">
        <div className="opener-in">
          <div>
            {c.hero.portrait && (
              <img className="plate" src={c.hero.portrait} alt={`Portrait of ${c.hero.name}`}
                   width="168" height="210" />
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
                  <span key={i}><b>{s.n}</b> {s.label.toLowerCase()}</span>
                ))}
              </div>
            )}

            <div className="actions">
              {(c.hero.links || []).map((l, i) => (
                <a key={i} className={l.primary ? 'lead' : ''} href={l.url}
                   target={ext(l.url) ? '_blank' : undefined} rel={ext(l.url) ? 'noopener' : undefined}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main id="main">

        <section id="research" className="page">
          <div className="band">
            <Rail n={1} label={c.research.eyebrow} />
            <div>
              <h2>{c.research.heading}</h2>
              {(c.research.paragraphs || []).map((p, i) => <p key={i}>{p}</p>)}
              {(c.research.tags || []).length > 0 && (
                <ul className="inline-list">
                  {c.research.tags.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
              {(c.research.figures || []).length > 0 && (
                <>
                  {c.research.figuresNote && <p className="fignote">{c.research.figuresNote}</p>}
                  <div className="figrow">
                    {c.research.figures.map((f, i) => (
                      <figure key={i}>
                        <img src={f.src} alt={f.cap || ''} loading="lazy" decoding="async"
                             onClick={() => open({ src: f.src, cap: f.cap })} />
                        {f.cap && <figcaption>{f.cap}</figcaption>}
                      </figure>
                    ))}
                  </div>
                </>
              )}
              {(c.research.methods || []).length > 0 && (
                <div className="cols">
                  {c.research.methods.map((m, i) => (
                    <div key={i}>
                      <p className="col-h">{m.title}</p>
                      <p className="col-t">{m.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="publications" className="page">
          <div className="band">
            <Rail n={2} label="Publications" />
            <div>
              <h2>{c.publications.heading}</h2>
              <ol className="pubs">
                {(c.publications.items || []).map((p, i) => (
                  <li className="pub" key={i}>
                    <div className="pub-t">
                      {p.url ? <a href={p.url} target="_blank" rel="noopener">{p.title}</a> : p.title}
                    </div>
                    <div className="pub-a"><Authors authors={p.authors} me={p.me} /></div>
                    <div className="pub-m">
                      {p.journal && <em className="pub-j">{p.journal}</em>}
                      {(p.tags || []).map((t, j) => <span key={j}>{t}</span>)}
                      {p.lead && <span className="lead">{p.lead}</span>}
                    </div>
                  </li>
                ))}
              </ol>
              {c.publications.note && (
                <p className="note">
                  <Linked text={c.publications.note} phrase={c.publications.noteLinkText}
                          url={c.publications.noteLinkUrl} />
                </p>
              )}
            </div>
          </div>
        </section>

        <section id="software" className="page">
          <div className="band">
            <Rail n={3} label="Software" />
            <div>
              <h2>{c.software.heading}</h2>
              {(c.software.intro || []).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>

          {(c.software.projects || []).map((pr, i) => (
            <article className="proj" key={i}>
              <div className="band" style={{ borderTop: 0, paddingTop: 0 }}>
                <div className="rail" />
                <div>
                  <div className="proj-head">
                    <h3>{pr.name}</h3>
                    {[...(pr.pills || []), ...(pr.ghostPills || [])].map((p, j) => (
                      <span className="proj-kind" key={j}>{p}</span>
                    ))}
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

                  {(pr.featured || (pr.thumbs || []).length > 0) && (
                    <div className="plates">
                      {pr.featured && pr.featured.src && (
                        <Plate src={pr.featured.src} cap={pr.featured.cap} onOpen={open} />
                      )}
                      {(pr.thumbs || []).map((t, j) => (
                        <Plate key={j} src={t.src} cap={t.cap} onOpen={open} />
                      ))}
                    </div>
                  )}

                  {(pr.links || []).length > 0 && (
                    <div className="proj-links">
                      {pr.links.map((l, j) => (
                        <a key={j} href={l.url} target="_blank" rel="noopener">{l.label}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}

          {c.software.shared && (
            <div className="band" style={{ borderTop: 0, paddingTop: 0 }}>
              <div className="rail" />
              <p className="footnote">
                <b>{c.software.shared.split(',')[0]}</b>
                {c.software.shared.slice(c.software.shared.split(',')[0].length)}{' '}
                {c.software.sharedLinkText && (
                  <>
                    <a href={c.software.sharedLinkUrl} target="_blank" rel="noopener">
                      {c.software.sharedLinkText}
                    </a>{' '}
                    {c.software.sharedTail}
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        <section id="experience" className="page">
          <div className="band">
            <Rail n={4} label="Experience" />
            <div>
              <h2>{c.experience.heading}</h2>
              <ul className="tl">
                {(c.experience.items || []).map((e, i) => (
                  <li key={i}>
                    <span className="when">{e.when}</span>
                    <div className="what">
                      <h3>{e.title}</h3>
                      <span className="where">
                        {e.whereUrl
                          ? <a href={e.whereUrl} target="_blank" rel="noopener">{e.where}</a>
                          : e.where}
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
            <Rail n={5} label="Background" />
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
                  <p className="col-h">{c.background.awardsTitle}</p>
                  <ul className="plain">
                    {(c.background.awards || []).map((a, i) => (
                      <li key={i}>{a.name}<span className="yr">{a.year}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="col-h">{c.background.reviewTitle}</p>
                  <ul className="plain">
                    {(c.background.review || []).map((a, i) => (
                      <li key={i}>{a.name}<span className="yr">{a.year}</span></li>
                    ))}
                  </ul>
                </div>
              </div>

              {c.background.leadership && (
                <div style={{ marginTop: 38 }}>
                  <p className="col-h">{c.background.leadershipTitle}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '15.5px' }}>{c.background.leadership}</p>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      <div className="closing" id="contact">
        <div className="closing-in">
          <div className="band">
            <Rail n={6} label={c.contact.eyebrow} />
            <div>
              <h2>{c.contact.heading}</h2>
              <p>{c.contact.text}</p>
              <div className="actions" style={{ marginTop: 26 }}>
                {(c.contact.links || []).map((l, i) => (
                  <a key={i} className={l.primary ? 'lead' : ''} href={l.url}
                     target={ext(l.url) ? '_blank' : undefined} rel={ext(l.url) ? 'noopener' : undefined}>
                    {l.label}
                  </a>
                ))}
              </div>
              {(c.contact.groups || []).length > 0 && (
                <>
                  <p className="col-h" style={{ marginTop: 34 }}>{c.contact.groupsTitle}</p>
                  <div className="groups">
                    {c.contact.groups.map((g, i) => (
                      <a key={i} href={g.url} target="_blank" rel="noopener">{g.label}</a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer>
        <div className="foot-in">
          <span>{c.footer.left}</span>
          <span>{c.footer.right}</span>
        </div>
      </footer>

      <dialog className="lb" ref={dialogRef} onClose={() => setZoom(null)}
              onClick={(e) => { if (e.target === dialogRef.current) setZoom(null); }}>
        <div className="lb-box">
          {zoom && <img src={zoom.src} alt={zoom.cap || ''} />}
          <div className="lb-bar">
            <span className="lb-cap">{zoom ? zoom.cap : ''}</span>
            <button className="lb-close" type="button" onClick={() => setZoom(null)}>Close</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
