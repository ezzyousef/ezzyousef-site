/**
 * The dashboard's pre-publish checks: things a visitor would notice that the
 * schema check cannot know about. Warnings never block publishing; the
 * schema's errors do.
 *
 * Contrast is computed for the colours the page actually draws, in light and
 * in dark mode (the dark colours are derived from the light ones exactly as
 * src/theme.js derives them).
 */
import { cleanTheme, shift } from '../theme.js';
import { isSafeUrl } from './safe-url.js';

function luminance(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return null;
  const [r, g, b] = [1, 2, 3].map((i) => {
    const c = parseInt(m[i], 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, 1 to 21. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la == null || lb == null) return 0;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function themePairs(theme) {
  const t = cleanTheme(theme);
  const dark = {
    paper: shift(t.ground, -0.92), sunken: shift(t.ground, -0.95), ink: shift(t.ink, 0.90),
    muted: shift(t.muted, 0.58), accent: t.accentDark,
  };
  const sunken = shift(t.ground, -0.025);
  return [
    ['Text on the page', t.ink, t.ground],
    ['Secondary text on the page', t.muted, t.ground],
    ['Secondary text in the contact band', t.muted, sunken],
    ['Accent text and links on the page', t.accent, t.ground],
    ['White text on the accent colour', '#FFFFFF', t.accent],
    ['Dark mode: text', dark.ink, dark.paper],
    ['Dark mode: secondary text', dark.muted, dark.paper],
    ['Dark mode: secondary text in the contact band', dark.muted, dark.sunken],
    ['Dark mode: accent text and links', dark.accent, dark.paper],
  ];
}

const AA = 4.5;

/** Returns [{ level: 'warn'|'info', where, message }]. */
export function checkContent(doc) {
  const out = [];
  const warn = (where, message) => out.push({ level: 'warn', where, message });
  const info = (where, message) => out.push({ level: 'info', where, message });
  if (!doc || typeof doc !== 'object') return [{ level: 'warn', where: 'content', message: 'No content.' }];

  for (const [label, fg, bg] of themePairs(doc.theme)) {
    const r = contrast(fg, bg);
    if (r < AA) warn('Appearance', `${label}: contrast ${r.toFixed(2)}:1 is below the 4.5:1 that WCAG AA asks for body text.`);
  }

  const meta = doc.meta || {};
  if (!String(meta.title || '').trim()) warn('Page & footer', 'The browser tab title is empty.');
  const d = String(meta.description || '').trim();
  if (!d) warn('Page & footer', 'The search description is empty.');
  else if (d.length > 170) info('Page & footer', `The search description is ${d.length} characters; search results usually cut it near 160.`);

  for (const key of ['research', 'publications', 'software', 'experience', 'background', 'contact']) {
    if (doc[key] && !String(doc[key].heading || '').trim()) warn(key, 'This section has no heading, which screen-reader users navigate by.');
  }

  const images = [];
  (doc.research && doc.research.figures || []).forEach((f, i) => images.push([`Research figure ${i + 1}`, f]));
  (doc.software && doc.software.projects || []).forEach((p, i) => {
    if (p.featured && p.featured.src) images.push([`${p.name || `Project ${i + 1}`}: main screenshot`, p.featured]);
    (p.thumbs || []).forEach((t, j) => images.push([`${p.name || `Project ${i + 1}`}: thumbnail ${j + 1}`, t]));
  });
  for (const [where, img] of images) {
    if (img && img.src && !String(img.cap || '').trim()) warn(where, 'Image has no caption, so screen readers get no description of it.');
  }

  const links = [];
  const collect = (where, list) => (list || []).forEach((l, i) => links.push([`${where} ${i + 1}`, l]));
  collect('Hero button', doc.hero && doc.hero.links);
  collect('Contact button', doc.contact && doc.contact.links);
  collect('Research group', doc.contact && doc.contact.groups);
  (doc.software && doc.software.projects || []).forEach((p) => {
    collect(`${p.name}: link`, p.links);
    collect(`${p.name}: download`, p.downloads);
  });
  (doc.blocks || []).forEach((b, i) => collect(`${b.title || `Block ${i + 1}`}: link`, b.links));
  for (const [where, l] of links) {
    if (!l) continue;
    if (l.url && !String(l.label || '').trim()) warn(where, 'Link has a target but no label, so it is invisible or unnamed.');
    if (l.url && !isSafeUrl(l.url)) warn(where, 'Link target is not an allowed address and will not be published.');
    if (!l.url && String(l.label || '').trim()) info(where, 'Label without a link target; it will not be clickable.');
  }

  (doc.software && doc.software.projects || []).forEach((p) => {
    if (p.status === 'released' && !(p.downloads || []).length && !(p.links || []).length) {
      warn(p.name || 'Project', 'Marked released, but there is nothing to download and no repository link.');
    }
  });

  (doc.publications && doc.publications.items || []).forEach((p, i) => {
    if (!p.url && !p.doi) info(`Paper ${i + 1}`, 'No link or DOI, so readers cannot reach the paper.');
  });

  return out;
}
