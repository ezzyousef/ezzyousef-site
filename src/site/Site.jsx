import { useEffect, useRef, useState } from 'react';

/** Splits an author string so the person's own name can be bolded. */
function Authors({ authors, me }) {
  if (!me || !authors.includes(me)) return <>{authors}</>;
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

function Shot({ src, cap, onOpen, className }) {
  if (!src) return null;
  return (
    <img
      className={className || 'shot'}
      src={src}
      alt={cap || ''}
      loading="lazy"
      decoding="async"
      onClick={() => onOpen({ src, cap })}
    />
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
      { rootMargin: '-64px 0px -55% 0px', threshold: [0, 0.15, 0.4, 0.75, 1] }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [c.nav]);

  const open = (img) => setZoom(img);
  const stats = c.stats || [];

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>

      <nav className="nav" aria-label="Sections">
        <div className="nav-in">
          <a className="nav-name" href="#top">{c.hero.name}</a>
          <div className="nav-links">
            {(c.nav || []).map((n) => (
              <a key={n.href} href={n.href} aria-current={active === n.href.replace('#', '') ? 'true' : 'false'}>
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="shell hero-in">
          <div>
            {c.hero.showAvailable && c.hero.available && (
              <p className="avail"><span className="dot" />{c.hero.available}</p>
            )}
            <h1>{c.hero.name}</h1>
            <p className="role">
              {c.hero.roleLinkText && c.hero.role.includes(c.hero.roleLinkText) ? (
                <>
                  {c.hero.role.split(c.hero.roleLinkText)[0]}
                  <a className="grp" href={c.hero.roleLinkUrl} target="_blank" rel="noopener">
                    {c.hero.roleLinkText}
                  </a>
                  {c.hero.role.split(c.hero.roleLinkText)[1]}
                </>
              ) : (
                c.hero.role
              )}
            </p>
            <div className="links">
              {(c.hero.links || []).map((l, i) => (
                <a key={i} className={'link' + (l.primary ? ' primary' : '')} href={l.url}
                   target={l.url.startsWith('http') ? '_blank' : undefined}
                   rel={l.url.startsWith('http') ? 'noopener' : undefined}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          {c.hero.portrait && (
            <img className="portrait" src={c.hero.portrait} alt={`Portrait of ${c.hero.name}`} width="210" height="210" />
          )}
        </div>
      </header>

      {stats.length > 0 && (
        <div className="band">
          <div className="band-in" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
            {stats.map((s, i) => (
              <div className="stat" key={i}>
                <span className="stat-n">{s.n}</span>
                <span className="stat-l">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="shell" id="main">

        <section id="research">
          <div className="head">
            <p className="eyebrow">{c.research.eyebrow}</p>
            <h2>{c.research.heading}</h2>
          </div>
          {(c.research.paragraphs || []).map((p, i) => <p key={i}>{p}</p>)}
          {(c.research.tags || []).length > 0 && (
            <ul className="tags">{c.research.tags.map((t, i) => <li key={i}>{t}</li>)}</ul>
          )}
          {(c.research.methods || []).length > 0 && (
            <div className="methods">
              {c.research.methods.map((m, i) => (
                <div className="method" key={i}><b>{m.title}</b><span>{m.text}</span></div>
              ))}
            </div>
          )}
        </section>

        <section id="publications">
          <div className="head">
            <p className="eyebrow">{c.publications.eyebrow}</p>
            <h2>{c.publications.heading}</h2>
          </div>
          <ol className="pubs">
            {(c.publications.items || []).map((p, i) => (
              <li className="pub" key={i}>
                <div className="pub-t">
                  {p.url ? <a href={p.url} target="_blank" rel="noopener">{p.title}</a> : p.title}
                </div>
                <div className="pub-a"><Authors authors={p.authors} me={p.me} /></div>
                <div className="pub-m">
                  {p.journal && <span className="pub-j">{p.journal}</span>}
                  {(p.tags || []).map((t, j) => <span key={j}>{t}</span>)}
                  {p.lead && <span className="lead">{p.lead}</span>}
                </div>
              </li>
            ))}
          </ol>
          {c.publications.note && (
            <p className="note">
              {c.publications.noteLinkText && c.publications.note.includes(c.publications.noteLinkText) ? (
                <>
                  {c.publications.note.split(c.publications.noteLinkText)[0]}
                  <a href={c.publications.noteLinkUrl} target="_blank" rel="noopener">{c.publications.noteLinkText}</a>
                  {c.publications.note.split(c.publications.noteLinkText)[1]}
                </>
              ) : c.publications.note}
            </p>
          )}
        </section>

        <section id="software">
          <div className="head">
            <p className="eyebrow">{c.software.eyebrow}</p>
            <h2>{c.software.heading}</h2>
          </div>
          <div className="intro-soft">
            {(c.software.intro || []).map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {(c.software.projects || []).map((pr, i) => (
            <article className="proj" key={i}>
              <div className="proj-top">
                <h3>{pr.name}</h3>
                {(pr.pills || []).map((p, j) => <span className="pill" key={j}>{p}</span>)}
                {(pr.ghostPills || []).map((p, j) => <span className="pill ghost" key={j}>{p}</span>)}
              </div>
              <p>{pr.desc}</p>
              <div className="proj-body">
                <div>
                  {pr.featured && pr.featured.src && (
                    <figure className="featured">
                      <Shot src={pr.featured.src} cap={pr.featured.cap} onOpen={open} />
                      <figcaption>{pr.featured.cap}</figcaption>
                    </figure>
                  )}
                  {(pr.thumbs || []).length > 0 && (
                    <div className="thumbs">
                      {pr.thumbs.map((t, j) => <Shot key={j} src={t.src} cap={t.cap} onOpen={open} />)}
                    </div>
                  )}
                </div>
                <ul className="facts">
                  {(pr.facts || []).map((f, j) => (
                    <li key={j}><b>{f.label}</b><span>{f.text}</span></li>
                  ))}
                </ul>
              </div>
              {(pr.links || []).length > 0 && (
                <div className="proj-links">
                  {pr.links.map((l, j) => (
                    <a className="link" key={j} href={l.url} target="_blank" rel="noopener">{l.label}</a>
                  ))}
                </div>
              )}
            </article>
          ))}

          {c.software.shared && (
            <div className="shared">
              <p>
                <b>{c.software.shared.split(',')[0]}</b>
                {c.software.shared.slice(c.software.shared.split(',')[0].length)}{' '}
                {c.software.sharedLinkText && (
                  <>
                    <a href={c.software.sharedLinkUrl} target="_blank" rel="noopener">{c.software.sharedLinkText}</a>{' '}
                    {c.software.sharedTail}
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        <section id="experience">
          <div className="head">
            <p className="eyebrow">{c.experience.eyebrow}</p>
            <h2>{c.experience.heading}</h2>
          </div>
          <ul className="tl">
            {(c.experience.items || []).map((e, i) => (
              <li key={i}>
                <span className="when">{e.when}</span>
                <div className="what">
                  <h3>{e.title}</h3>
                  <span className="where">
                    {e.whereUrl
                      ? <a className="grp" href={e.whereUrl} target="_blank" rel="noopener">{e.where}</a>
                      : e.where}
                    {e.whereTail}
                  </span>
                  {e.text && <p>{e.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="background">
          <div className="head">
            <p className="eyebrow">{c.background.eyebrow}</p>
            <h2>{c.background.heading}</h2>
          </div>
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

          <div className="duo">
            <div>
              <p className="eyebrow">{c.background.awardsTitle}</p>
              <ul className="plain">
                {(c.background.awards || []).map((a, i) => (
                  <li key={i}>{a.name}<span className="yr">{a.year}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow">{c.background.reviewTitle}</p>
              <ul className="plain">
                {(c.background.review || []).map((a, i) => (
                  <li key={i}>{a.name}<span className="yr">{a.year}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {c.background.leadership && (
            <div style={{ marginTop: 42 }}>
              <p className="eyebrow">{c.background.leadershipTitle}</p>
              <p>{c.background.leadership}</p>
            </div>
          )}
        </section>

      </main>

      <div className="contact" id="contact">
        <div className="contact-in">
          <p className="eyebrow">{c.contact.eyebrow}</p>
          <h2>{c.contact.heading}</h2>
          <p>{c.contact.text}</p>
          <div className="links" style={{ marginTop: 24 }}>
            {(c.contact.links || []).map((l, i) => (
              <a key={i} className={'link' + (l.primary ? ' primary' : '')} href={l.url}
                 target={l.url.startsWith('http') ? '_blank' : undefined}
                 rel={l.url.startsWith('http') ? 'noopener' : undefined}>
                {l.label}
              </a>
            ))}
          </div>
          {(c.contact.groups || []).length > 0 && (
            <>
              <p className="eyebrow" style={{ marginTop: 34 }}>{c.contact.groupsTitle}</p>
              <div className="groups">
                {c.contact.groups.map((g, i) => (
                  <a className="link" key={i} href={g.url} target="_blank" rel="noopener">{g.label}</a>
                ))}
              </div>
            </>
          )}
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
            <button className="lb-close" type="button" onClick={() => setZoom(null)}>Close&nbsp;&nbsp;Esc</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
