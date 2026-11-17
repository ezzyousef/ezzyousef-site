/**
 * Pure functions that turn the content document into static HTML. Used by
 * scripts/prerender.mjs at build time; kept free of file access so they can
 * be tested.
 */

import { safeHref } from '../src/lib/safe-url.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/** JSON inside <script> must not be able to end the element or start a
 *  comment, so <, > and & are written as unicode escapes; U+2028/2029 are
 *  escaped for old parsers. The result is still valid JSON. */
export function jsonForScript(obj) {
  return JSON.stringify(obj).replace(/[<>&\u2028\u2029]/g,
    (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
}

export function jsonLdTag(obj) {
  return `<script type="application/ld+json">${jsonForScript(obj)}</script>`;
}

/** An anchor when the URL is safe, plain text when it is not. */
function link(url, text) {
  const href = safeHref(url);
  return href ? `<a href="${esc(href)}">${text}</a>` : text;
}

export function homeBody(seed) {
  const part = [];
  part.push(`<h1>${esc(seed.hero.name)}</h1>`);
  part.push(`<p>${esc(seed.hero.role)}</p>`);

  part.push(`<h2>${esc(seed.research.heading)}</h2>`);
  for (const p of seed.research.paragraphs || []) part.push(`<p>${esc(p)}</p>`);

  part.push('<h2>Publications</h2><ol>');
  for (const p of seed.publications.items || []) {
    const title = link(p.url, esc(p.title));
    part.push(`<li>${title}. ${esc(p.authors)}. <i>${esc(p.journal)}</i>.</li>`);
  }
  part.push('</ol>');

  part.push('<h2>Software</h2>');
  for (const pr of seed.software.projects || []) {
    part.push(`<h3>${esc(pr.name)}</h3><p>${esc(pr.desc)}</p>`);
  }

  part.push('<h2>Experience</h2><ul>');
  for (const e of seed.experience.items || []) {
    part.push(`<li>${esc(e.title)}, ${esc(e.where)}${esc(e.whereTail)} (${esc(e.when)}). ${esc(e.text)}</li>`);
  }
  part.push('</ul>');

  part.push('<h2>Education</h2><ul>');
  for (const e of seed.background.education || []) {
    part.push(`<li>${esc(e.title)}, ${esc(e.where)} (${esc(e.when)})</li>`);
  }
  part.push('</ul>');

  part.push(`<h2>Contact</h2><p>${esc(seed.contact.text)}</p><ul>`);
  for (const l of seed.contact.links || []) {
    part.push(`<li>${link(l.url, esc(l.label))}</li>`);
  }
  part.push('</ul>');
  return part.join('');
}

/** Each paper as a ScholarlyArticle, so search engines index the work itself. */
export function articlesLd(seed) {
  return (seed.publications.items || []).map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: p.title,
    name: p.title,
    author: String(p.authors || '').split(',').map((a) => ({ '@type': 'Person', name: a.trim() })),
    isPartOf: p.journal ? { '@type': 'Periodical', name: p.journal } : undefined,
    url: safeHref(p.url),
  }));
}

export function personLd(seed) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Ezzeldien Muhammed Yousef',
    url: 'https://ezzyousef-site.vercel.app/',
    jobTitle: 'PhD Researcher, Mechanical & Industrial Engineering',
    affiliation: { '@type': 'Organization', name: 'University of Toronto' },
    alumniOf: [
      { '@type': 'Organization', name: 'The American University in Cairo' },
      { '@type': 'Organization', name: 'Suez University' },
    ],
    memberOf: (seed.contact.groups || []).map((g) => ({
      '@type': 'Organization', name: g.label, url: safeHref(g.url),
    })),
    knowsAbout: seed.research.tags || [],
    sameAs: (seed.hero.links || []).map((l) => l.url).filter((u) => u.startsWith('http')),
  };
}

/** Writes the static body, JSON-LD, title and description into the page shell. */
export function renderHome(shell, seed) {
  // Function replacers throughout: a string replacement would treat "$'" or
  // "$&" in the content as a pattern and splice in other parts of the page.
  let html = shell.replace('<div id="root"></div>', () => `<div id="root">${homeBody(seed)}</div>`);
  const ld = [personLd(seed), ...articlesLd(seed)].map(jsonLdTag).join('');
  html = html.replace('</head>', () => `${ld}</head>`);
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(seed.meta.title)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => `${a}${esc(seed.meta.description)}${b}`);
  return html;
}
