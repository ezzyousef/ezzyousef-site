/** Font choices offered in the dashboard. Each is loaded from Google Fonts. */
export const FONTS = {
  display: ['Spectral', 'Fraunces', 'Newsreader', 'Libre Baskerville', 'Playfair Display', 'Archivo', 'Bricolage Grotesque'],
  body: ['Karla', 'Public Sans', 'Work Sans', 'Source Sans 3', 'Figtree', 'Nunito Sans'],
  mono: ['JetBrains Mono', 'IBM Plex Mono', 'Space Mono', 'Roboto Mono'],
};

const WEIGHTS = {
  display: 'wght@500;600;700',
  body: 'wght@400;500;600;700',
  mono: 'wght@400;500',
};

/** Builds the Google Fonts URL for the three chosen families. */
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

/** Mixes a hex colour toward white or black. amount -1..1 */
function shift(hex, amount) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const ch = [1, 2, 3].map((i) => {
    const v = parseInt(m[i], 16);
    return Math.round(v + (to - v) * a).toString(16).padStart(2, '0');
  });
  return '#' + ch.join('');
}

function rgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** The whole stylesheet, derived from the theme object so the dashboard can
 *  change colours, fonts and sizes and see the result immediately. */
export function css(t) {
  const accentSoft = shift(t.accent, 0.86);
  const sunken = shift(t.ground, -0.04);
  const faint = shift(t.muted, 0.28);
  const hazeA = t.haze ? rgba(shift(t.accent, 0.45), 0.5) : 'rgba(0,0,0,0)';
  const hazeB = rgba(shift(t.accent, 0.45), 0);

  const dAccent = t.accentDark || '#4FC7E8';
  const dGround = '#0A1014';
  const dSurface = '#121B21';
  const dInk = '#E6EEF2';
  const dMuted = '#91A3AE';
  const dHair = '#1F2C33';
  const dAccentSoft = shift(dAccent, -0.78);
  const dHaze = t.haze ? rgba(dAccent, 0.2) : 'rgba(0,0,0,0)';

  const darkTokens = `
    --ground: ${dGround};
    --surface: ${dSurface};
    --sunken: #0D151A;
    --ink: ${dInk};
    --muted: ${dMuted};
    --faint: #6D7F8A;
    --hair: ${dHair};
    --accent: ${dAccent};
    --accent-ink: #06161C;
    --accent-soft: ${dAccentSoft};
    --haze-a: ${dHaze};
    --haze-b: ${rgba(dAccent, 0)};
    --shadow-s: 0 1px 2px rgba(0,0,0,.5);
    --shadow-m: 0 1px 2px rgba(0,0,0,.5), 0 10px 30px -20px rgba(0,0,0,.9);
    --scrim: rgba(3,8,11,.82);`;

  return `
:root {
  --ground: ${t.ground};
  --surface: ${t.surface};
  --sunken: ${sunken};
  --ink: ${t.ink};
  --muted: ${t.muted};
  --faint: ${faint};
  --hair: ${t.hair};
  --accent: ${t.accent};
  --accent-ink: #FFFFFF;
  --accent-soft: ${accentSoft};
  --haze-a: ${hazeA};
  --haze-b: ${hazeB};
  --shadow-s: 0 1px 2px rgba(15,23,32,.05);
  --shadow-m: 0 1px 2px rgba(15,23,32,.05), 0 10px 30px -20px rgba(15,23,32,.3);
  --scrim: rgba(15,23,32,.72);
  --display: "${t.fontDisplay}", Georgia, serif;
  --body: "${t.fontBody}", "Helvetica Neue", Arial, sans-serif;
  --mono: "${t.fontMono}", ui-monospace, Consolas, monospace;
  --radius: ${t.radius}px;
  --gutter: clamp(20px, 5vw, 56px);
  --measure: 68ch;
  --max: 1120px;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {${darkTokens} } }
:root[data-theme="dark"] {${darkTokens} }

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
body {
  margin: 0; background: var(--ground); color: var(--ink);
  font-family: var(--body); font-size: ${t.baseSize}px; line-height: 1.62;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; display: block; }
a { color: var(--accent); text-underline-offset: 3px; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }
::selection { background: var(--accent-soft); color: var(--ink); }

.skip { position: absolute; left: -9999px; top: 0; background: var(--accent); color: var(--accent-ink);
  padding: 10px 18px; z-index: 100; font-family: var(--mono); font-size: 13px; text-decoration: none; }
.skip:focus { left: 8px; top: 8px; }

.nav { position: sticky; top: 0; z-index: 30; border-bottom: 1px solid var(--hair);
  background: color-mix(in srgb, var(--ground) 86%, transparent); backdrop-filter: blur(12px) saturate(140%); }
.nav-in { max-width: var(--max); margin: 0 auto; padding: 10px var(--gutter); display: flex; align-items: center; gap: 20px; }
.nav-name { font-family: var(--display); font-weight: 600; font-size: 16px; white-space: nowrap; text-decoration: none; color: var(--ink); }
.nav-links { display: flex; gap: 4px; margin-left: auto; overflow-x: auto; scrollbar-width: none; }
.nav-links::-webkit-scrollbar { display: none; }
.nav-links a { font-family: var(--mono); font-size: 12px; color: var(--muted); text-decoration: none;
  padding: 6px 11px; border-radius: 100px; white-space: nowrap; transition: color .15s, background-color .15s; }
.nav-links a:hover { color: var(--ink); }
.nav-links a[aria-current="true"] { color: var(--accent); background: var(--accent-soft); }
@media (max-width: 620px) { .nav-name { display: none; } .nav-links { margin-left: 0; } }

.shell { max-width: var(--max); margin: 0 auto; padding-inline: var(--gutter); }
section { padding-block: clamp(52px, 7.5vw, 90px) 0; scroll-margin-top: 62px; }
.head { margin-bottom: clamp(26px, 3.5vw, 38px); }
.eyebrow { font-family: var(--mono); font-size: 11.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 0 0 13px; }
h2 { font-family: var(--display); font-weight: 600; font-size: clamp(27px, 3.6vw, ${t.headingSize}px);
  line-height: 1.13; letter-spacing: -.015em; margin: 0 0 16px; max-width: 24ch; text-wrap: balance; }
h3 { font-family: var(--display); font-weight: 600; font-size: 19px; margin: 0 0 4px; }
p { margin: 0 0 16px; max-width: var(--measure); }
p:last-child { margin-bottom: 0; }

.hero { position: relative; overflow: hidden; padding-block: clamp(46px, 8vw, 96px) clamp(30px, 4.5vw, 52px); }
.hero::before { content: ""; position: absolute; inset: -34% -12% auto auto; width: min(780px, 100vw);
  aspect-ratio: 1; background: radial-gradient(circle at 58% 42%, var(--haze-a), var(--haze-b) 63%); pointer-events: none; }
.hero-in { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: clamp(26px,5vw,64px); align-items: center; }
.avail { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11.5px;
  letter-spacing: .05em; text-transform: uppercase; color: var(--muted); margin: 0 0 18px; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); flex: none; }
h1 { font-family: var(--display); font-weight: 600; font-size: clamp(39px, 6.8vw, ${t.heroSize}px);
  line-height: 1.01; letter-spacing: -.028em; margin: 0 0 18px; text-wrap: balance; }
.role { font-size: clamp(17px, 1.9vw, 20px); color: var(--muted); max-width: 47ch; margin: 0 0 26px; }
.role strong { color: var(--ink); font-weight: 600; }
.portrait { width: clamp(128px, 19vw, 210px); aspect-ratio: 1; border-radius: 50%; object-fit: cover;
  border: 1px solid var(--hair); box-shadow: var(--shadow-m); }
@media (max-width: 680px) { .hero-in { grid-template-columns: 1fr; } .portrait { order: -1; } }

.links { display: flex; flex-wrap: wrap; gap: 9px; }
.link { font-family: var(--mono); font-size: 12.5px; text-decoration: none; color: var(--ink); background: var(--surface);
  border: 1px solid var(--hair); border-radius: 100px; padding: 9px 17px; box-shadow: var(--shadow-s);
  transition: border-color .15s, color .15s, transform .15s; }
.link:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
.link.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.link.primary:hover { color: var(--accent-ink); opacity: .92; }

.band { border-block: 1px solid var(--hair); background: var(--surface); }
.band-in { display: grid; max-width: var(--max); margin: 0 auto; padding-inline: var(--gutter); }
.stat { padding: 24px 20px 24px 0; border-right: 1px solid var(--hair); }
.stat:last-child { border-right: 0; }
.stat-n { font-family: var(--display); font-size: clamp(25px,3.3vw,35px); font-weight: 600; line-height: 1;
  font-variant-numeric: tabular-nums; display: block; margin-bottom: 7px; }
.stat-l { font-family: var(--mono); font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); }
@media (max-width: 560px) {
  .band-in { grid-template-columns: 1fr !important; }
  .stat { border-right: 0; border-bottom: 1px solid var(--hair); padding: 18px 0; }
  .stat:last-child { border-bottom: 0; }
}

.tags { display: flex; flex-wrap: wrap; gap: 7px; margin: 0 0 24px; padding: 0; list-style: none; }
.tags li { font-family: var(--mono); font-size: 12px; padding: 5px 12px; border-radius: 4px; background: var(--accent-soft); color: var(--accent); }
.methods { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap: 22px 32px; margin-top: 30px; }
.method { border-top: 2px solid var(--accent); padding-top: 14px; }
.method b { font-family: var(--mono); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); display: block; margin-bottom: 7px; }
.method span { font-size: 15.5px; color: var(--muted); }

.pubs { list-style: none; margin: 0; padding: 0; counter-reset: pub; }
.pub { counter-increment: pub; display: grid; grid-template-columns: 2.4rem minmax(0,1fr); gap: 4px 14px;
  padding: 19px 0; border-top: 1px solid var(--hair); }
.pub:last-of-type { border-bottom: 1px solid var(--hair); }
.pub::before { content: counter(pub, decimal-leading-zero); font-family: var(--mono); font-size: 12px; color: var(--faint); padding-top: 5px; }
.pub-t { font-weight: 600; font-size: 16.5px; line-height: 1.4; }
.pub-t a { color: inherit; text-decoration: none; background-image: linear-gradient(var(--accent), var(--accent));
  background-size: 0 1px; background-repeat: no-repeat; background-position: 0 100%; transition: background-size .2s, color .2s; }
.pub-t a:hover, .pub-t a:focus-visible { background-size: 100% 1px; color: var(--accent); }
.pub-a { grid-column: 2; font-size: 14.5px; color: var(--muted); }
.pub-a .me { color: var(--ink); font-weight: 700; }
.pub-m { grid-column: 2; display: flex; flex-wrap: wrap; gap: 5px 13px; margin-top: 7px; font-family: var(--mono); font-size: 11.5px; color: var(--faint); }
.pub-j { color: var(--accent); }
.pub-m .lead { color: var(--ink); }
@media (max-width: 560px) { .pub { grid-template-columns: 1fr; } .pub::before { padding-top: 0; } .pub-a, .pub-m { grid-column: 1; } }
.note { font-size: 14px; color: var(--muted); margin-top: 16px; }

.intro-soft { margin-bottom: 34px; }
.proj { background: var(--surface); border: 1px solid var(--hair); border-radius: var(--radius);
  box-shadow: var(--shadow-m); padding: clamp(20px,3vw,30px); margin-bottom: 22px; }
.proj-top { display: flex; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.proj-top h3 { margin: 0; font-size: 22px; }
.pill { font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase;
  padding: 4px 9px; border-radius: 3px; background: var(--accent-soft); color: var(--accent); white-space: nowrap; }
.pill.ghost { background: transparent; color: var(--faint); border: 1px solid var(--hair); }
.proj > p { color: var(--muted); }
.proj-body { display: grid; grid-template-columns: minmax(0,1.25fr) minmax(0,1fr); gap: clamp(20px,3vw,34px); margin-top: 20px; align-items: start; }
@media (max-width: 800px) { .proj-body { grid-template-columns: 1fr; } }
.featured { margin: 0; }
.shot { width: 100%; aspect-ratio: 16/10; object-fit: cover; object-position: top center;
  border: 1px solid var(--hair); border-radius: 6px; background: var(--sunken); cursor: zoom-in; transition: border-color .15s; }
.shot:hover { border-color: var(--accent); }
figcaption { font-family: var(--mono); font-size: 11px; color: var(--faint); margin-top: 8px; }
.thumbs { display: grid; grid-template-columns: repeat(3,1fr); gap: 9px; margin-top: 12px; }
.thumbs .shot { border-radius: 4px; }
.facts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.facts li { display: grid; gap: 2px; }
.facts b { font-family: var(--mono); font-size: 12px; color: var(--accent); }
.facts span { font-size: 15px; color: var(--muted); }
.proj-links { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 18px; }
.shared { border: 1px dashed var(--hair); border-radius: 8px; padding: 20px 22px; }
.shared p { margin: 0; color: var(--muted); font-size: 15.5px; }
.shared b { color: var(--ink); font-family: var(--mono); font-size: 14px; }

.tl { list-style: none; margin: 0; padding: 0; }
.tl li { padding: 21px 0; border-top: 1px solid var(--hair); display: grid; grid-template-columns: 186px minmax(0,1fr); gap: 6px 26px; }
.tl li:last-child { border-bottom: 1px solid var(--hair); }
.tl .when { font-family: var(--mono); font-size: 12.5px; color: var(--faint); padding-top: 4px; }
.tl .where { font-size: 15px; color: var(--muted); }
.tl .what p { margin: 7px 0 0; font-size: 15.5px; color: var(--muted); max-width: 62ch; }
@media (max-width: 640px) { .tl li { grid-template-columns: 1fr; } }
.grp { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--accent-soft); }
.grp:hover { border-bottom-color: var(--accent); }
.groups { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 16px; }

.duo { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px,1fr)); gap: clamp(26px,4vw,48px); margin-top: 42px; }
.plain { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.plain li { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 4px 16px; align-items: baseline;
  font-size: 15.5px; border-bottom: 1px dotted var(--hair); padding-bottom: 9px; }
.plain .yr { font-family: var(--mono); font-size: 12px; color: var(--faint); white-space: nowrap; }

.contact { margin-top: clamp(54px,8vw,92px); border-top: 1px solid var(--hair); background: var(--surface); }
.contact-in { max-width: var(--max); margin: 0 auto; padding: clamp(42px,6vw,72px) var(--gutter); }
footer { border-top: 1px solid var(--hair); background: var(--sunken); }
.foot-in { max-width: var(--max); margin: 0 auto; padding: 22px var(--gutter) calc(22px + env(safe-area-inset-bottom,0px));
  display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-family: var(--mono); font-size: 11.5px; color: var(--faint); }

dialog.lb { border: 0; padding: 0; background: transparent; max-width: 96vw; max-height: 94vh; color: var(--ink); }
dialog.lb::backdrop { background: var(--scrim); backdrop-filter: blur(3px); }
.lb-box { background: var(--surface); border: 1px solid var(--hair); border-radius: var(--radius); padding: 12px; box-shadow: var(--shadow-m); }
.lb-box img { max-height: 78vh; width: auto; border-radius: 5px; margin-inline: auto; }
.lb-bar { display: flex; align-items: center; gap: 14px; padding: 10px 4px 2px; }
.lb-cap { font-family: var(--mono); font-size: 11.5px; color: var(--muted); margin-right: auto; }
.lb-close { font-family: var(--mono); font-size: 12px; background: var(--ground); color: var(--ink);
  border: 1px solid var(--hair); border-radius: 100px; padding: 6px 14px; cursor: pointer; }
.lb-close:hover { border-color: var(--accent); color: var(--accent); }
`;
}
