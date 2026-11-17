import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderHome } from '../../scripts/render-static.mjs';

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));
const SHELL = '<!doctype html><html><head><title>x</title><meta name="description" content="d"></head><body><div id="root"></div></body></html>';

function withPub(patch) {
  const c = structuredClone(seed);
  c.publications.items = [{ ...c.publications.items[0], ...patch }];
  return c;
}

describe('prerendered HTML', () => {
  it('keeps a "</script>" inside a title from closing the JSON-LD element', () => {
    const html = renderHome(SHELL, withPub({ title: 'A</script><script>alert(1)</script>' }));
    expect(html).not.toContain('<script>alert(1)');
    // every JSON-LD block must still parse
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(blocks.length).toBeGreaterThan(1);
    for (const [, body] of blocks) expect(() => JSON.parse(body)).not.toThrow();
  });

  it('does not write javascript: or data: links into the static copy', () => {
    const c = withPub({ url: 'javascript:alert(1)' });
    c.contact.links = [{ label: 'x', url: ' JaVaScRiPt:alert(2)' }, { label: 'y', url: 'data:text/html,hi' }];
    const html = renderHome(SHELL, c);
    expect(html.toLowerCase()).not.toMatch(/href="\s*(javascript|data):/);
  });

  it('treats $ sequences in content literally', () => {
    const c = structuredClone(seed);
    c.meta.description = "costs $' and $& and $1";
    c.hero.name = "Name $'";
    const html = renderHome(SHELL, c);
    expect(html).toContain("costs $' and $&amp; and $1");
    expect(html).toContain("<h1>Name $'</h1>");
  });

  it('writes the shipped content', () => {
    const html = renderHome(SHELL, seed);
    expect(html).toContain(`<h1>${seed.hero.name}</h1>`);
    expect(html).toContain('"@type":"Person"');
  });
});

import { renderProject, render404, sitemap, robots, projectBody } from '../../scripts/render-static.mjs';
import { migrate } from '../../src/lib/content-schema.js';

describe('static pages', () => {
  const doc = migrate(seed);
  const shell = '<!doctype html><html><head><title>x</title><meta name="description" content="d">' +
    '<meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="/assets/portrait.jpg"></head>' +
    '<body><div id="root"></div></body></html>';

  it('gives the home page an absolute image, a canonical address and links to every project page', () => {
    const html = renderHome(shell, doc, 'https://example.test');
    expect(html).toContain('<meta property="og:image" content="https://example.test/assets/portrait.jpg">');
    expect(html).toContain('<link rel="canonical" href="https://example.test/">');
    expect(html).toContain('href="/software/aerolab-studio/"');
  });

  it('writes a project page with its own title, canonical address and software metadata', () => {
    const html = renderProject(shell, doc, 1, 'https://example.test');
    expect(html).toContain('<title>Supercap Suite · Ezzeldien Yousef</title>');
    expect(html).toContain('<link rel="canonical" href="https://example.test/software/supercap-suite/">');
    expect(html).toContain('"@type":"SoftwareApplication"');
    expect(html).toContain('href="/#software"');
  });

  it('says plainly when a project has no installer, and lists downloads when it has them', () => {
    const pr = doc.software.projects[0];
    expect(projectBody(doc, pr)).toContain('No installer is offered here yet; the source code is linked below.');
    const withDl = { ...pr, downloads: [{ label: 'Windows installer', url: 'https://example.test/a.exe', platform: 'Windows' }], status: 'released', version: '1.3.0' };
    const body = projectBody(doc, withDl);
    expect(body).toContain('<a href="https://example.test/a.exe">Windows installer</a> (Windows)');
    expect(body).toContain('<dt>Status</dt><dd>Released</dd>');
    expect(body).not.toContain('No installer');
  });

  it('writes a not-found page that links home and is not indexed', () => {
    const html = render404(doc);
    expect(html).toContain('href="/"');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('data-page="404"');
    expect(html).not.toContain('<script');
  });

  it('lists every page in the sitemap and points robots.txt at it', () => {
    const sm = sitemap(doc, 'https://example.test/');
    expect(sm.match(/<loc>/g)).toHaveLength(1 + doc.software.projects.length);
    expect(sm).toContain('<loc>https://example.test/software/brookfield-dv1-logger/</loc>');
    expect(robots('https://example.test')).toContain('Sitemap: https://example.test/sitemap.xml');
  });

  it('renders owner blocks and keeps phone numbers on one line', () => {
    const d = structuredClone(doc);
    d.blocks = [{ title: 'Talks', paragraphs: ['A talk.'], links: [{ label: 'Slides', url: 'https://example.test/s.pdf' }, { label: 'bad', url: 'javascript:x' }] }];
    const html = renderHome(shell, d);
    expect(html).toContain('<h2>Talks</h2><p>A talk.</p><ul><li><a href="https://example.test/s.pdf">Slides</a></li></ul>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('+1&nbsp;942&nbsp;662&nbsp;0110');
  });
});
