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
