/**
 * Pure functions that turn the content document into static HTML. Used by
 * scripts/prerender.mjs at build time; kept free of file access so they can
 * be tested.
 *
 * The static copy is what search engines, link previews and visitors without
 * JavaScript get. React replaces it as soon as the page loads.
 */

import { safeHref } from '../src/lib/safe-url.js';
import { projectSlugs, projectPath } from '../src/lib/slug.js';
import { infoRows, downloadsOf, noInstallerNote } from '../src/lib/project.js';
import { doiOf } from '../src/lib/citation.js';
import { css } from '../src/theme.js';

export const DEFAULT_SITE_URL = 'https://ezzyousef-site.vercel.app';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/** JSON inside <script> must not be able to end the element or start a
 *  comment, so <, > and & are written as unicode escapes; U+2028/2029 are
 *  escaped for old parsers. The result is still valid JSON. */
const SCRIPT_UNSAFE = new RegExp('[<>&' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');

export function jsonForScript(obj) {
  return JSON.stringify(obj).replace(SCRIPT_UNSAFE,
    (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
}

export function jsonLdTag(obj) {
  return `<script type="application/ld+json">${jsonForScript(obj)}</script>`;
}

const absolute = (siteUrl, path) => {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  return siteUrl.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
};

/** Link text for a telephone number keeps its digits together. */
const labelFor = (l) => (/^tel:/i.test(String(l.url || '')) ? esc(l.label).replace(/ /g, '&nbsp;') : esc(l.label));

/** An anchor when the URL is safe, plain text when it is not. */
function link(url, text) {
  const href = safeHref(url);
  return href ? `<a href="${esc(href)}">${text}</a>` : text;
}

function blocksHtml(seed) {
  const part = [];
  for (const b of seed.blocks || []) {
    if (!b || !b.title) continue;
    part.push(`<h2>${esc(b.title)}</h2>`);
    for (const p of b.paragraphs || []) part.push(`<p>${esc(p)}</p>`);
    const links = (b.links || []).filter((l) => safeHref(l.url));
    if (links.length) part.push('<ul>' + links.map((l) => `<li>${link(l.url, labelFor(l))}</li>`).join('') + '</ul>');
  }
  return part.join('');
}

export function homeBody(seed) {
  const part = [];
  part.push(`<h1>${esc(seed.hero.name)}</h1>`);
  part.push(`<p>${esc(seed.hero.role)}</p>`);

  part.push(`<h2>${esc(seed.research.heading)}</h2>`);
  for (const p of seed.research.paragraphs || []) part.push(`<p>${esc(p)}</p>`);

  part.push(`<h2>${esc(seed.publications.heading || 'Publications')}</h2><ol>`);
  for (const p of seed.publications.items || []) {
    const doi = doiOf(p);
    const title = link(p.url || (doi ? `https://doi.org/${doi}` : ''), esc(p.title));
    part.push(`<li>${title}. ${esc(p.authors)}. <i>${esc(p.journal)}</i>${p.year ? ` (${esc(p.year)})` : ''}.</li>`);
  }
  part.push('</ol>');

  part.push(`<h2>${esc(seed.software.heading || 'Software')}</h2>`);
  const slugs = projectSlugs(seed.software.projects);
  (seed.software.projects || []).forEach((pr, i) => {
    part.push(`<h3><a href="${projectPath(slugs[i])}">${esc(pr.name)}</a></h3><p>${esc(pr.desc)}</p>`);
  });

  part.push(`<h2>${esc(seed.experience.heading || 'Experience')}</h2><ul>`);
  for (const e of seed.experience.items || []) {
    part.push(`<li>${esc(e.title)}, ${esc(e.where)}${esc(e.whereTail)} (${esc(e.when)}). ${esc(e.text)}</li>`);
  }
  part.push('</ul>');

  part.push('<h2>Education</h2><ul>');
  for (const e of seed.background.education || []) {
    part.push(`<li>${esc(e.title)}, ${esc(e.where)} (${esc(e.when)})</li>`);
  }
  part.push('</ul>');

  part.push(blocksHtml(seed));

  part.push(`<h2>Contact</h2><p>${esc(seed.contact.text)}</p><ul>`);
  for (const l of seed.contact.links || []) {
    part.push(`<li>${link(l.url, labelFor(l))}</li>`);
  }
  part.push('</ul>');
  return part.join('');
}

export function projectBody(seed, pr) {
  const part = [];
  part.push(`<p><a href="/#software">All software</a></p>`);
  part.push(`<h1>${esc(pr.name)}</h1>`);
  part.push(`<p>${esc(pr.desc)}</p>`);
  for (const p of pr.detail || []) part.push(`<p>${esc(p)}</p>`);
  const rows = infoRows(pr);
  if (rows.length) part.push('<dl>' + rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>');
  if ((pr.facts || []).length) {
    part.push('<ul>' + pr.facts.map((f) => `<li><b>${esc(f.label)}</b>: ${esc(f.text)}</li>`).join('') + '</ul>');
  }
  const dls = downloadsOf(pr);
  if (dls.length) {
    part.push('<h2>Downloads</h2><ul>' + dls.map((d) => `<li>${link(d.url, esc(d.label || d.url))}${d.platform ? ` (${esc(d.platform)})` : ''}</li>`).join('') + '</ul>');
  } else {
    part.push(`<p>${esc(noInstallerNote(pr))}</p>`);
  }
  const links = [...(pr.links || []),
    pr.docsUrl ? { label: 'Documentation', url: pr.docsUrl } : null,
    pr.changelogUrl ? { label: 'Changelog', url: pr.changelogUrl } : null].filter((l) => l && safeHref(l.url));
  if (links.length) part.push('<ul>' + links.map((l) => `<li>${link(l.url, esc(l.label))}</li>`).join('') + '</ul>');
  return part.join('');
}

/** Each paper as a ScholarlyArticle, so search engines index the work itself. */
export function articlesLd(seed) {
  return (seed.publications.items || []).map((p) => {
    const doi = doiOf(p);
    return {
      '@context': 'https://schema.org',
      '@type': 'ScholarlyArticle',
      headline: p.title,
      name: p.title,
      author: String(p.authors || '').split(',').map((a) => ({ '@type': 'Person', name: a.replace(/\*/g, '').trim() })),
      isPartOf: p.journal ? { '@type': 'Periodical', name: p.journal } : undefined,
      datePublished: p.year || undefined,
      identifier: doi ? { '@type': 'PropertyValue', propertyID: 'DOI', value: doi } : undefined,
      url: safeHref(p.url) || (doi ? `https://doi.org/${doi}` : undefined),
    };
  });
}

export function personLd(seed, siteUrl = DEFAULT_SITE_URL) {
  const orcid = seed.profile && seed.profile.orcid ? `https://orcid.org/${seed.profile.orcid}` : null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Ezzeldien Muhammed Yousef',
    url: `${siteUrl.replace(/\/$/, '')}/`,
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
    sameAs: [...(seed.hero.links || []).map((l) => l.url).filter((u) => /^https?:/i.test(String(u || ''))), orcid].filter(Boolean),
  };
}

export function softwareLd(pr, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: pr.name,
    description: pr.desc,
    url,
    applicationCategory: 'ScientificApplication',
    operatingSystem: (pr.platforms || []).filter(Boolean).join(', ') || undefined,
    softwareVersion: pr.version || undefined,
    license: safeHref(pr.license) || undefined,
    codeRepository: safeHref(((pr.links || []).find((l) => /github\.com|gitlab\.com/i.test(String(l.url || ''))) || {}).url),
  };
}

/** Title, description, canonical and Open Graph tags for one page. */
export function applyHead(html, { title, description, canonical, image }) {
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => `${a}${esc(description)}${b}`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, (_, a, b) => `${a}${esc(title)}${b}`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, (_, a, b) => `${a}${esc(description)}${b}`);
  if (image) html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, (_, a, b) => `${a}${esc(image)}${b}`);
  const extra = `<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}">`;
  return html.replace('</head>', () => `${extra}</head>`);
}

const description = (s, n = 158) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
};

/** Writes the static body, JSON-LD and head tags into the page shell. */
export function renderHome(shell, seed, siteUrl = DEFAULT_SITE_URL) {
  // Function replacers throughout: a string replacement would treat "$'" or
  // "$&" in the content as a pattern and splice in other parts of the page.
  let html = shell.replace('<div id="root"></div>', () => `<div id="root">${homeBody(seed)}</div>`);
  const ld = [personLd(seed, siteUrl), ...articlesLd(seed)].map(jsonLdTag).join('');
  html = html.replace('</head>', () => `${ld}</head>`);
  return applyHead(html, {
    title: seed.meta.title,
    description: seed.meta.description,
    canonical: `${siteUrl.replace(/\/$/, '')}/`,
    image: absolute(siteUrl, seed.hero.portrait),
  });
}

export function renderProject(shell, seed, index, siteUrl = DEFAULT_SITE_URL) {
  const pr = seed.software.projects[index];
  const slug = projectSlugs(seed.software.projects)[index];
  const url = absolute(siteUrl, projectPath(slug));
  let html = shell.replace('<div id="root"></div>', () => `<div id="root">${projectBody(seed, pr)}</div>`);
  html = html.replace('</head>', () => `${jsonLdTag(softwareLd(pr, url))}</head>`);
  return applyHead(html, {
    title: `${pr.name} · ${seed.hero.name}`,
    description: description(pr.desc),
    canonical: url,
    image: absolute(siteUrl, (pr.featured && pr.featured.src) || seed.hero.portrait),
  });
}

/** A standalone not-found page in the site's own colours. No script. */
export function render404(seed) {
  const nav = (seed.nav || []).filter((n) => /^#[a-z0-9-]+$/i.test(n.href))
    .map((n) => `<a href="/${esc(n.href)}">${esc(n.label)}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found · ${esc(seed.hero.name)}</title>
<style>${css(seed.theme)}
.nf { max-width: var(--max); margin: 0 auto; padding: clamp(52px, 10vw, 120px) var(--pad); }
.nf h1 { font-size: clamp(34px, 6vw, 56px); }
.nf nav { display: flex; flex-wrap: wrap; gap: 10px 22px; margin-top: 28px; }
.nf nav a, .nf .home { font-family: var(--mono); font-size: 13px; display: inline-block; padding: 4px 0; }
</style>
</head>
<body data-page="404">
<main class="nf">
<p class="status">Error 404</p>
<h1>This page does not exist</h1>
<p>The address may be mistyped, or the page may have moved. Everything on this site starts from the home page.</p>
<p><a class="home" href="/">Go to the home page</a></p>
<nav aria-label="Sections">${nav}</nav>
</main>
</body>
</html>
`;
}

export function sitemap(seed, siteUrl = DEFAULT_SITE_URL) {
  const base = siteUrl.replace(/\/$/, '');
  const urls = [`${base}/`, ...projectSlugs(seed.software.projects).map((s) => base + projectPath(s))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n') + '\n</urlset>\n';
}

export function robots(siteUrl = DEFAULT_SITE_URL) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl.replace(/\/$/, '')}/sitemap.xml\n`;
}
