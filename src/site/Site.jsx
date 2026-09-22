import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Picture, { largest } from './Picture.jsx';

/** A small pointer-follow tilt on screenshots, figures and project blocks.
 *  Skipped entirely when the viewer asks for reduced motion. */
const REDUCED = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

function tilt(max = 5, lift = 4) {
  if (REDUCED) return {};
  return {
    onMouseMove: (e) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-${lift}px)`;
    },
    onMouseLeave: (e) => { e.currentTarget.style.transform = ''; },
  };
}

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

/** The margin column that carries a section's number and label. The number
 *  links to its own section, the way a printed paper lets you cite one. */
function Rail({ n, label, href }) {
  const num = String(n).padStart(2, '0');
  return (
    <div className="rail">
      {href
        ? <a className="rail-num" href={href} aria-label={`Link to ${label}`}>{num}</a>
        : <span className="rail-num">{num}</span>}
      <span className="rail-lab">{label}</span>
    </div>
  );
}

/** Appears once the reader is past the opening screen. */
function BackToTop() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const onScroll = () => setOn(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button type="button" className={'totop' + (on ? ' on' : '')} aria-hidden={!on}
            tabIndex={on ? 0 : -1} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      Top
    </button>
  );
}

function Plate({ item, group, index, onOpen, sizes }) {
  if (!item || !item.src) return null;
  return (
    <figure className="tilt" {...tilt(6, 3)}>
      <Picture className="shot" src={item.src} alt={item.cap} sizes={sizes}
               onClick={() => onOpen(group, index)} />
      {item.cap && <figcaption>{item.cap}</figcaption>}
    </figure>
  );
}

/** One line of plain text, the way it would be pasted into a reference list. */
function citationOf(p) {
  const bits = [p.authors, `“${p.title}”`, p.journal].filter(Boolean);
  return bits.join('. ').replace(/\.\.$/, '.') + (p.url ? `. ${p.url}` : '.');
}

function CopyCitation({ pub }) {
  const [state, setState] = useState('idle');
  const copy = async () => {
    const text = citationOf(pub);
    try {
      await navigator.clipboard.writeText(text);
      setState('done');
    } catch {
      setState('manual');
    }
    setTimeout(() => setState('idle'), 2500);
  };
  return (
    <button type="button" className="cite" onClick={copy}
            aria-label={`Copy the citation for ${pub.title}`}>
      {state === 'done' ? 'copied' : state === 'manual' ? 'press ⌘C' : 'cite'}
    </button>
  );
}

export default function Site({ c }) {
  const [zoom, setZoom] = useState(null);        // { group, index }
  const [active, setActive] = useState('');
  const [onlyFirst, setOnlyFirst] = useState(false);
  const dialogRef = useRef(null);
  const lastFocus = useRef(null);

  const openGallery = useCallback((group, index) => {
    lastFocus.current = document.activeElement;
    setZoom({ group, index });
  }, []);

  const close = useCallback(() => {
    setZoom(null);
    if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus();
  }, []);

  const step = useCallback((delta) => {
    setZoom((z) => (z ? { ...z, index: (z.index + delta + z.group.length) % z.group.length } : z));
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (zoom && !d.open) d.showModal();
    if (!zoom && d.open) d.close();
  }, [zoom]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, step]);

  // preload the neighbours so arrowing through feels instant
  useEffect(() => {
    if (!zoom || zoom.group.length < 2) return;
    [1, -1].forEach((d) => {
      const n = zoom.group[(zoom.index + d + zoom.group.length) % zoom.group.length];
      if (n) { const img = new Image(); img.src = largest(n.src); }
    });
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

  const ext = (u) => (u || '').startsWith('http');
  const pubs = c.publications.items || [];
  const firstCount = useMemo(
    () => pubs.filter((p) => (p.lead || '').toLowerCase().includes('first')).length, [pubs]);
  const shown = onlyFirst
    ? pubs.filter((p) => (p.lead || '').toLowerCase().includes('first'))
    : pubs;

  const figures = c.research.figures || [];
  const current = zoom ? zoom.group[zoom.index] : null;

  // swipe on a touch screen
  const touch = useRef(null);
  const swipe = {
    onTouchStart: (e) => { touch.current = e.changedTouches[0].clientX; },
    onTouchEnd: (e) => {
      if (touch.current == null) return;
      const dx = e.changedTouches[0].clientX - touch.current;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      touch.current = null;
    },
  };

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
                      <figure key={i} className="tilt" {...tilt(5, 3)}>
                        <Picture src={f.src} alt={f.cap}
                                 sizes="(max-width: 700px) 92vw, 30vw"
                                 onClick={() => openGallery(figures, i)} />
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
            <Rail n={2} label="Publications" href="#publications" />
            <div>
              <h2>{c.publications.heading}</h2>

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

              <ol className="pubs">
                {shown.map((p, i) => (
                  <li className="pub" key={p.title || i}>
                    <div className="pub-t">
                      {p.url ? <a href={p.url} target="_blank" rel="noopener">{p.title}</a> : p.title}
                    </div>
                    <div className="pub-a"><Authors authors={p.authors} me={p.me} /></div>
                    <div className="pub-m">
                      {p.journal && <em className="pub-j">{p.journal}</em>}
                      {(p.tags || []).map((t, j) => <span key={j}>{t}</span>)}
                      {p.lead && <span className="lead">{p.lead}</span>}
                      <CopyCitation pub={p} />
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
            <Rail n={3} label="Software" href="#software" />
            <div>
              <h2>{c.software.heading}</h2>
              {(c.software.intro || []).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>

          {(c.software.projects || []).map((pr, i) => {
            const group = [pr.featured, ...(pr.thumbs || [])].filter((x) => x && x.src);
            return (
              <article className="proj tilt" key={i} {...tilt(3, 4)}>
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

                    {group.length > 0 && (
                      <div className="plates">
                        {group.map((g, j) => (
                          <Plate key={j} item={g} group={group} index={j} onOpen={openGallery}
                                 sizes="(max-width: 800px) 45vw, 22vw" />
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
            );
          })}

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
            <Rail n={6} label={c.contact.eyebrow} href="#contact" />
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

      <BackToTop />

      <footer>
        <div className="foot-in">
          <span>{c.footer.left}</span>
          <span>{c.footer.right}</span>
        </div>
      </footer>

      <dialog className="lb" ref={dialogRef} aria-modal="true" aria-label="Image viewer"
              onClose={close}
              onClick={(e) => { if (e.target === dialogRef.current) close(); }}>
        <div className="lb-box" {...swipe}>
          {current && <img src={largest(current.src)} alt={current.cap || ''} />}
          <div className="lb-bar">
            {zoom && zoom.group.length > 1 && (
              <>
                <button className="lb-nav" type="button" onClick={() => step(-1)} aria-label="Previous image">←</button>
                <span className="lb-count">{zoom.index + 1} / {zoom.group.length}</span>
                <button className="lb-nav" type="button" onClick={() => step(1)} aria-label="Next image">→</button>
              </>
            )}
            <span className="lb-cap">{current ? current.cap : ''}</span>
            <button className="lb-close" type="button" onClick={close}>Close</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
