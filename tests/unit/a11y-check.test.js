import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrast, checkContent, themePairs } from '../../src/lib/a11y-check.js';
import { migrate } from '../../src/lib/content-schema.js';

const seed = migrate(JSON.parse(readFileSync('data/seed.json', 'utf8')));

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('pre-publish checks', () => {
  it('passes the shipped theme in light and dark mode', () => {
    const low = themePairs(seed.theme).filter(([, fg, bg]) => contrast(fg, bg) < 4.5);
    expect(low).toEqual([]);
    expect(checkContent(seed).filter((w) => w.level === 'warn')).toEqual([]);
  });

  it('warns about a low-contrast secondary colour', () => {
    const doc = structuredClone(seed);
    doc.theme.muted = '#BBBBBB';
    const w = checkContent(doc).filter((x) => x.where === 'Appearance');
    expect(w.some((x) => /Secondary text on the page/.test(x.message))).toBe(true);
  });

  it('warns about images without captions, unnamed links and empty headings', () => {
    const doc = structuredClone(seed);
    doc.research.figures[0].cap = '';
    doc.contact.links.push({ label: '', url: 'https://example.org' });
    doc.publications.heading = '';
    const msgs = checkContent(doc).map((w) => `${w.where}: ${w.message}`);
    expect(msgs.some((m) => m.startsWith('Research figure 1: Image has no caption'))).toBe(true);
    expect(msgs.some((m) => /Contact button 6: Link has a target but no label/.test(m))).toBe(true);
    expect(msgs.some((m) => m.startsWith('publications: This section has no heading'))).toBe(true);
  });

  it('flags a project marked released with nothing to download', () => {
    const doc = structuredClone(seed);
    Object.assign(doc.software.projects[0], { status: 'released', downloads: [], links: [] });
    expect(checkContent(doc).some((w) => /Marked released/.test(w.message))).toBe(true);
  });
});
