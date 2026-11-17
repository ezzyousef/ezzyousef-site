import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { css, fontHref } from '../../src/theme.js';

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));

describe('theme stylesheet', () => {
  it('cannot be broken out of by a font name or colour from stored content', () => {
    // A browser can hold content from before validation existed, in its cache.
    const bad = {
      ...seed.theme,
      fontBody: 'X"; } body { display:none } .y { a:"',
      accent: 'red; } body { background: url(https://evil.example/x) } .z {',
      baseSize: '17px; } * { display:none',
    };
    const sheet = css(bad);
    expect(sheet).not.toContain('display:none');
    expect(sheet).not.toContain('evil.example');
  });

  it('builds the normal stylesheet from the shipped theme', () => {
    const sheet = css(seed.theme);
    expect(sheet).toContain(`--accent: ${seed.theme.accent}`);
    expect(sheet).toContain('"Newsreader"');
    expect(fontHref(seed.theme)).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=Newsreader/);
  });

  it('only asks Google Fonts for fonts on the offered list', () => {
    expect(fontHref({ ...seed.theme, fontBody: 'Evil&x=1' })).not.toContain('Evil');
  });
});
