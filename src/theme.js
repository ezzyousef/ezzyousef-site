/** Font choices offered in the dashboard. Each is loaded from Google Fonts. */
export const FONTS = {
  display: ['Newsreader', 'Spectral', 'Source Serif 4', 'Fraunces', 'Libre Baskerville', 'Playfair Display', 'Archivo'],
  body: ['Archivo', 'Public Sans', 'Work Sans', 'Source Sans 3', 'Karla', 'Figtree'],
  mono: ['IBM Plex Mono', 'JetBrains Mono', 'Space Mono', 'Roboto Mono'],
};

const WEIGHTS = {
  display: 'wght@400;500;600',
  body: 'wght@400;500;600;700',
  mono: 'wght@400;500',
};

export function fontHref(theme) {
  const fams = [
    [theme.fontDisplay, WEIGHTS.display],
    [theme.fontBody, WEIGHTS.body],
    [theme.fontMono, WEIGHTS.mono],
  ]
    .filter(([name]) => name)
    .map(([name, w]) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:${w}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
}

function shift(hex, amount) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return '#' + [1, 2, 3].map((i) => {
    const v = parseInt(m[i], 16);
    return Math.round(v + (to - v) * a).toString(16).padStart(2, '0');
  }).join('');
}

function rgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The stylesheet, derived from the theme so the dashboard can change
 * colours, fonts and sizes live.
 *
 * The design is modelled on a printed scientific offprint: a narrow margin
 * column carrying section numbers and labels, a wide measure of running text,
 * hairline rules instead of boxes, and a single spot colour used the way a
 * second ink would be on press.
 */
export function css(t) {
  const tint = rgba(t.accent, 0.07);
  const sunken = shift(t.ground, -0.025);
  const faint = t.muted;

  const dAccent = t.accentDark || '#E0705F';
  const darkTokens = `
    --paper: #14140F;
    --surface: #1A1A15;
    --sunken: #100F0B;
    --ink: #EAE7DE;
    --muted: ${shift(t.muted, 0.58)};
    --faint: ${shift(t.muted, 0.38)};
    --rule: #2D2C26;
    --accent: ${dAccent};
    --accent-ink: #14140F;
    --tint: ${rgba(dAccent, 0.12)};
    --scrim: rgba(8, 8, 6, .88);`;

  return `
:root {
  --paper: ${t.ground};
  --surface: ${t.surface};
  --sunken: ${sunken};
  --ink: ${t.ink};
  --muted: ${t.muted};
  --faint: ${faint};
  --rule: ${t.hair};
  --accent: ${t.accent};
  --accent-ink: #FFFFFF;
  --tint: ${tint};
  --scrim: rgba(20, 20, 15, .82);
  --display: "${t.fontDisplay}", Georgia, serif;
  --body: "${t.fontBody}", "Helvetica Neue", Arial, sans-serif;
  --mono: "${t.fontMono}", ui-monospace, Consolas, monospace;
  --radius: ${t.radius}px;
  --pad: clamp(22px, 5vw, 64px);
  --rail: 168px;
  --max: 1000px;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {${darkTokens} } }
:root[data-theme="dark"] {${darkTokens} }

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition-duration: .01ms !important; }
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--body);
  font-size: ${t.baseSize}px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; display: block; }
a { color: var(--ink); text-decoration-color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 3px; }
a:hover { color: var(--accent); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
::selection { background: var(--tint); color: var(--ink); }

.skip { position: absolute; left: -9999px; background: var(--accent); color: var(--accent-ink);
  padding: 10px 18px; z-index: 100; font-family: var(--mono); font-size: 13px; text-decoration: none; }
.skip:focus { left: 8px; top: 8px; }


/* ---------------------------------------------------------------- cards */
.card {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: calc(var(--radius) + 6px);
  box-shadow:
    0 1px 1px rgba(20, 20, 15, .04),
    0 2px 4px rgba(20, 20, 15, .04),
    0 8px 16px -8px rgba(20, 20, 15, .10);
  transition: transform .22s cubic-bezier(.2,.7,.3,1), box-shadow .22s cubic-bezier(.2,.7,.3,1), border-color .22s;
  transform-style: preserve-3d;
  will-change: transform;
}
.card:hover, .card:focus-within {
  border-color: var(--accent);
  box-shadow:
    0 2px 2px rgba(20, 20, 15, .05),
    0 8px 14px -4px rgba(20, 20, 15, .10),
    0 26px 44px -22px rgba(20, 20, 15, .34);
}
.card-pad { padding: clamp(18px, 2.6vw, 28px); }

/* the pointer tilt is applied inline by the page; this keeps it smooth */
.tilt { transition: transform .12s ease-out, box-shadow .22s cubic-bezier(.2,.7,.3,1), border-color .22s; }

@media (prefers-reduced-motion: reduce) {
  .card, .tilt { transition: border-color .2s; }
  .card:hover, .card:focus-within { transform: none; }
}

/* ---------------------------------------------------------------- shell */
.page { max-width: var(--max); margin: 0 auto; padding-inline: var(--pad); }

/* Two columns: a margin rail for numbers and labels, then the text block. */
.band { display: grid; grid-template-columns: var(--rail) minmax(0, 1fr); gap: 0 34px; }
@media (max-width: 760px) { .band { grid-template-columns: 1fr; gap: 0; } }

.rail { padding-top: 6px; }
.rail-num { font-family: var(--mono); font-size: 12px; color: var(--accent); letter-spacing: .04em; display: block; }
.rail-lab { font-family: var(--mono); font-size: 11px; letter-spacing: .13em; text-transform: uppercase;
  color: var(--faint); display: block; margin-top: 5px; }
@media (max-width: 760px) {
  .rail { padding: 0 0 14px; display: flex; gap: 12px; align-items: baseline; }
  .rail-lab { margin-top: 0; }
}

section { padding-block: clamp(46px, 6vw, 76px) 0; scroll-margin-top: 20px; }
section + section .band { border-top: 1px solid var(--rule); padding-top: clamp(30px, 4vw, 48px); }

h2 { font-family: var(--display); font-weight: 500; font-size: clamp(25px, 3.2vw, ${t.headingSize}px);
  line-height: 1.18; letter-spacing: -.012em; margin: 0 0 20px; max-width: 22ch; }
h3 { font-family: var(--display); font-weight: 600; font-size: 20px; margin: 0 0 5px; letter-spacing: -.01em; }
p { margin: 0 0 17px; max-width: 64ch; }
p:last-child { margin-bottom: 0; }

/* ----------------------------------------------------------------- nav */
.topbar { position: sticky; top: 0; z-index: 30; background: var(--paper); border-bottom: 1px solid var(--rule); }
.topbar-in { max-width: var(--max); margin: 0 auto; padding: 0 var(--pad); display: flex; align-items: stretch; gap: 0; }
.topbar a { font-family: var(--mono); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--faint); text-decoration: none; padding: 13px 0; margin-right: 26px; white-space: nowrap;
  border-bottom: 2px solid transparent; margin-bottom: -1px; }
.topbar a:hover { color: var(--ink); }
.topbar a[aria-current="true"] { color: var(--accent); border-bottom-color: var(--accent); }
.topbar-scroll { display: flex; overflow-x: auto; scrollbar-width: none; }
.topbar-scroll::-webkit-scrollbar { display: none; }

/* --------------------------------------------------------------- opener */
.opener { padding-block: clamp(52px, 8vw, 104px) clamp(26px, 4vw, 44px); }
.opener-in { display: grid; grid-template-columns: var(--rail) minmax(0, 1fr); gap: 0 34px; align-items: start; }
@media (max-width: 760px) { .opener-in { grid-template-columns: 1fr; } }

.plate { width: var(--rail); max-width: 168px; aspect-ratio: 4 / 5; object-fit: cover; object-position: center top;
  border-radius: 1px; filter: saturate(.92); }
@media (max-width: 760px) { .plate { width: 116px; margin-bottom: 26px; } }

h1 { font-family: var(--display); font-weight: 500; letter-spacing: -.028em; line-height: 1.02;
  font-size: clamp(38px, 7vw, ${t.heroSize}px); margin: 0 0 22px; }
.lede { font-size: clamp(17px, 1.8vw, 20px); line-height: 1.55; color: var(--ink); max-width: 46ch; margin: 0 0 26px; }
.lede a { color: var(--accent); }
.status { font-family: var(--mono); font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--accent); margin: 0 0 20px; display: block; }

.facts-line { font-family: var(--mono); font-size: 12px; color: var(--faint); margin: 0 0 26px;
  display: flex; flex-wrap: wrap; gap: 6px 16px; }
.facts-line span { white-space: nowrap; }
.facts-line b { color: var(--ink); font-weight: 500; }

.actions { display: flex; flex-wrap: wrap; gap: 0 22px; }
.actions a { font-family: var(--mono); font-size: 12.5px; letter-spacing: .03em; text-decoration: none;
  color: var(--ink); border-bottom: 1px solid var(--rule); padding: 3px 0; transition: border-color .15s, color .15s; }
.actions a:hover { color: var(--accent); border-bottom-color: var(--accent); }
.actions a.lead { color: var(--accent); border-bottom-color: var(--accent); }

/* ---------------------------------------------------------------- lists */
.inline-list { margin: 22px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 5px 0;
  font-family: var(--mono); font-size: 12px; color: var(--muted); max-width: 64ch; }
.inline-list li::after { content: "·"; margin: 0 9px; color: var(--faint); }
.inline-list li:last-child::after { content: ""; margin: 0; }

.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 24px 34px; margin-top: 30px; }
.col-h { font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
  color: var(--accent); margin: 0 0 8px; }
.col-t { font-size: 15.5px; color: var(--muted); line-height: 1.55; margin: 0; }

/* --------------------------------------------------------- publications */
.pubs { list-style: none; margin: 0; padding: 0; counter-reset: pub; }
.pub { counter-increment: pub; display: grid; grid-template-columns: 2.1rem minmax(0, 1fr); gap: 3px 12px;
  padding: 17px 0; border-bottom: 1px solid var(--rule); }
.pub:first-child { border-top: 1px solid var(--rule); }
.pub::before { content: counter(pub, decimal-leading-zero); font-family: var(--mono); font-size: 11.5px;
  color: var(--faint); padding-top: 5px; }
.pub-t { font-family: var(--display); font-size: 17.5px; font-weight: 500; line-height: 1.35; letter-spacing: -.008em; }
.pub-t a { text-decoration: none; }
.pub-a { grid-column: 2; font-size: 14px; color: var(--muted); line-height: 1.5; }
.pub-a .me { color: var(--ink); font-weight: 600; }
.pub-m { grid-column: 2; margin-top: 5px; font-family: var(--mono); font-size: 11.5px; color: var(--faint);
  display: flex; flex-wrap: wrap; gap: 3px 0; }
.pub-m > * { white-space: nowrap; }
.pub-m > *::after { content: "·"; margin: 0 8px; color: var(--rule); }
.pub-m > *:last-child::after { content: ""; margin: 0; }
.pub-j { color: var(--accent); font-style: normal; }
.pub-m .lead { color: var(--ink); }
@media (max-width: 560px) { .pub { grid-template-columns: 1fr; } .pub::before { padding-top: 0; } .pub-a, .pub-m { grid-column: 1; } }
.note { font-size: 13.5px; color: var(--faint); margin-top: 18px; }

/* -------------------------------------------------------------- projects */
.proj { padding-top: clamp(34px, 4vw, 52px); }
.proj + .proj { border-top: 1px solid var(--rule); }
.proj-head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 10px; }
.proj-head h3 { margin: 0; font-size: 23px; }
.proj-kind { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); }
.proj-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.78fr); gap: 20px 40px; align-items: start; }
@media (max-width: 800px) { .proj-split { grid-template-columns: 1fr; } }
.proj-split > p { color: var(--muted); }
.facts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.facts li { padding: 9px 0; border-top: 1px solid var(--rule); display: grid; gap: 2px; }
.facts li:first-child { border-top: 0; padding-top: 0; }
.facts b { font-family: var(--mono); font-size: 11.5px; letter-spacing: .04em; color: var(--accent); font-weight: 500; }
.facts span { font-size: 14.5px; color: var(--muted); line-height: 1.5; }

.figrow { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-top: 30px; }
.figrow figure { margin: 0; }
.figrow img { width: 100%; height: auto; background: #fff; border: 1px solid var(--rule); border-radius: 1px; cursor: zoom-in; }
.figrow img:hover { border-color: var(--accent); }
.fignote { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--faint); margin: 30px 0 0; }
.fignote + .figrow { margin-top: 12px; }

.plates { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 26px; }
@media (max-width: 800px) { .plates { grid-template-columns: repeat(2, 1fr); } }
.plates figure { margin: 0; overflow: hidden; }
.plates figure.card figcaption { padding: 9px 12px 12px; margin-top: 0; }
.shot { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; object-position: top center;
  background: var(--sunken); border: 1px solid var(--rule); border-radius: 1px; cursor: zoom-in; transition: border-color .15s; }
.shot:hover { border-color: var(--accent); }
figcaption { font-family: var(--mono); font-size: 10.5px; color: var(--faint); margin-top: 7px; line-height: 1.45; }
.proj-links { margin-top: 20px; display: flex; gap: 22px; flex-wrap: wrap; }
.proj-links a { font-family: var(--mono); font-size: 12px; text-decoration: none; color: var(--accent);
  border-bottom: 1px solid var(--rule); padding-bottom: 2px; }
.proj-links a:hover { border-bottom-color: var(--accent); }
.footnote { margin-top: clamp(30px, 4vw, 46px); padding-top: 18px; border-top: 1px solid var(--rule);
  font-size: 14.5px; color: var(--muted); max-width: 66ch; }
.footnote b { font-family: var(--mono); font-size: 13px; color: var(--ink); font-weight: 500; }

/* ------------------------------------------------------------- timeline */
.tl { list-style: none; margin: 0; padding: 0; }
.tl li { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 4px 26px; padding: 18px 0; border-bottom: 1px solid var(--rule); }
.tl li:first-child { border-top: 1px solid var(--rule); }
.tl .when { font-family: var(--mono); font-size: 11.5px; color: var(--faint); padding-top: 6px; }
.tl .where { font-size: 14.5px; color: var(--muted); display: block; }
.tl .what p { margin: 8px 0 0; font-size: 15px; color: var(--muted); max-width: 60ch; }
@media (max-width: 640px) { .tl li { grid-template-columns: 1fr; } .tl .when { padding-top: 0; } }

.pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px 40px; margin-top: 38px; }
.plain { list-style: none; margin: 0; padding: 0; }
.plain li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 14px; align-items: baseline;
  font-size: 14.5px; padding: 7px 0; border-bottom: 1px solid var(--rule); color: var(--muted); }
.plain li:first-child { border-top: 1px solid var(--rule); }
.plain .yr { font-family: var(--mono); font-size: 11.5px; color: var(--faint); }

/* -------------------------------------------------------------- closing */
.closing { margin-top: clamp(52px, 7vw, 90px); border-top: 1px solid var(--rule); background: var(--sunken); }
.closing-in { max-width: var(--max); margin: 0 auto; padding: clamp(40px, 6vw, 70px) var(--pad); }
.closing .band { border-top: 0; }
.groups { display: flex; flex-wrap: wrap; gap: 0 22px; margin-top: 12px; }
.groups a { font-family: var(--mono); font-size: 12px; text-decoration: none; color: var(--muted);
  border-bottom: 1px solid var(--rule); padding-bottom: 2px; }
.groups a:hover { color: var(--accent); border-bottom-color: var(--accent); }

footer { border-top: 1px solid var(--rule); }
.foot-in { max-width: var(--max); margin: 0 auto; padding: 20px var(--pad) calc(20px + env(safe-area-inset-bottom, 0px));
  display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  font-family: var(--mono); font-size: 11px; color: var(--faint); }

/* ------------------------------------------------------------- lightbox */
dialog.lb { border: 0; padding: 0; background: transparent; max-width: 96vw; max-height: 94vh; color: var(--ink); }
dialog.lb::backdrop { background: var(--scrim); }
.lb-box { background: var(--surface); border: 1px solid var(--rule); padding: 10px; }
.lb-box img { max-height: 78vh; width: auto; margin-inline: auto; }
.lb-bar { display: flex; align-items: center; gap: 14px; padding: 10px 2px 2px; }
.lb-cap { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-right: auto; }
.lb-close { font-family: var(--mono); font-size: 11px; letter-spacing: .06em; text-transform: uppercase;
  background: transparent; color: var(--muted); border: 1px solid var(--rule); padding: 7px 14px; cursor: pointer; }
.lb-close:hover { color: var(--accent); border-color: var(--accent); }
`;
}
