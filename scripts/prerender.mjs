/**
 * Writes a plain-HTML copy of the content into dist/index.html, inside the
 * element React mounts into. React replaces it the moment the page loads, so
 * visitors never see it, but anything that reads HTML without running
 * JavaScript, search engines and link previews included, gets the real text.
 *
 * It reflects data/seed.json, so after editing in the dashboard this fallback
 * is one deploy behind. That is fine: it exists for crawlers, not for readers.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const part = [];
part.push(`<h1>${esc(seed.hero.name)}</h1>`);
part.push(`<p>${esc(seed.hero.role)}</p>`);

part.push(`<h2>${esc(seed.research.heading)}</h2>`);
for (const p of seed.research.paragraphs || []) part.push(`<p>${esc(p)}</p>`);

part.push('<h2>Publications</h2><ol>');
for (const p of seed.publications.items || []) {
  const title = p.url
    ? `<a href="${esc(p.url)}">${esc(p.title)}</a>`
    : esc(p.title);
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
  part.push(`<li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`);
}
part.push('</ul>');

const person = {
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
    '@type': 'Organization', name: g.label, url: g.url,
  })),
  knowsAbout: seed.research.tags || [],
  sameAs: (seed.hero.links || []).map((l) => l.url).filter((u) => u.startsWith('http')),
};

const file = 'dist/index.html';
let html = readFileSync(file, 'utf8');

html = html.replace(
  '<div id="root"></div>',
  `<div id="root">${part.join('')}</div>`
);
html = html.replace(
  '</head>',
  `<script type="application/ld+json">${JSON.stringify(person)}</script></head>`
);
// Keep the title and description in step with the content.
html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(seed.meta.title)}</title>`);
html = html.replace(
  /(<meta name="description" content=")[^"]*(")/,
  `$1${esc(seed.meta.description)}$2`
);

writeFileSync(file, html);
console.log('Prerendered fallback written:', part.join('').length, 'characters');
