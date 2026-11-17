import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadContent } from '../../src/lib/merge.js';
import { migrate } from '../../src/lib/content-schema.js';

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));

describe('loadContent', () => {
  it('migrates saved lists even when the build copy is already current', () => {
    const saved = structuredClone(seed);             // saved before the upgrade
    saved.software.projects = [{ name: 'Only one', desc: 'x' }];
    const c = loadContent(migrate(seed), saved);
    expect(c.software.projects).toHaveLength(1);
    expect(c.software.projects[0].downloads).toEqual([]);
    expect(c.software.projects[0].name).toBe('Only one');
  });

  it('keeps saved values over the build copy and fills fields the save lacks', () => {
    const saved = { hero: { name: 'Saved name' } };
    const c = loadContent(seed, saved);
    expect(c.hero.name).toBe('Saved name');
    expect(c.hero.role).toBe(seed.hero.role);
  });

  it('falls back to the build copy for nothing or junk', () => {
    expect(loadContent(seed, null).hero.name).toBe(seed.hero.name);
    expect(loadContent(seed, [1, 2]).hero.name).toBe(seed.hero.name);
  });
});
