import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { slugify, projectSlugs, slugFromPath } from '../../src/lib/slug.js';

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));

describe('slugs', () => {
  it('names the shipped projects', () => {
    expect(projectSlugs(seed.software.projects)).toEqual(
      ['aerolab-studio', 'supercap-suite', 'ftir-xrd-toolkit', 'brookfield-dv1-logger']);
  });
  it('keeps slugs unique and never empty', () => {
    expect(projectSlugs([{ name: 'A' }, { name: 'a' }, { name: '' }, {}])).toEqual(['a', 'a-2', 'project-3', 'project-4']);
  });
  it('strips accents and symbols', () => {
    expect(slugify('Ça & Ünïcode — tool')).toBe('ca-unicode-tool');
  });
  it('reads a slug out of a path, and nothing out of other paths', () => {
    expect(slugFromPath('/software/supercap-suite/')).toBe('supercap-suite');
    expect(slugFromPath('/software/supercap-suite')).toBe('supercap-suite');
    expect(slugFromPath('/software/../etc')).toBeNull();
    expect(slugFromPath('/')).toBeNull();
  });
});
