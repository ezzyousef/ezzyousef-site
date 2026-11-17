import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { citationText, toBibtex, bibEscape, matches, doiOf, authorList } from '../../src/lib/citation.js';

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));
const pubs = seed.publications.items;

describe('citations', () => {
  it('formats a paper with its DOI link', () => {
    const p = { ...pubs[1], year: '2026' };
    expect(citationText(p)).toBe(
      'A. A. Akar, M. A. Moselhy, G. E. Khedr, E. Yousef, N. K. Allam (2026). ' +
      'Engineering reline/carboxymethyl cellulose eutectogel electrolytes through nanoscale water confinement and coordination-driven ion percolation. ' +
      'Chemical Engineering Journal. https://doi.org/10.1016/j.cej.2026.176245');
  });

  it('falls back to the page link when there is no DOI, and drops the asterisks', () => {
    const p = pubs[4];
    expect(doiOf(p)).toBe('');
    expect(authorList(p)[0]).toBe('E. Yousef');
    expect(citationText(p)).toMatch(/\. https:\/\/pubs\.rsc\.org\//);
    expect(citationText(p)).not.toContain('*');
  });
});

describe('BibTeX', () => {
  it('escapes LaTeX special characters', () => {
    expect(bibEscape('A & B_1 {x} 50% $5 #1 ~ ^ \\')).toBe(
      'A \\& B\\_1 \\{x\\} 50\\% \\$5 \\#1 \\textasciitilde{} \\textasciicircum{} \\textbackslash{}');
  });

  it('writes one entry per paper with unique keys', () => {
    const bib = toBibtex(pubs);
    const keys = [...bib.matchAll(/^@article\{([^,]+),/gm)].map((m) => m[1]);
    expect(keys).toHaveLength(pubs.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect(bib).toContain('doi = {10.1016/j.cej.2026.176245}');
    expect(bib).toContain('author = {E. Yousef and A. A. Ismail and G. E. Khedr and N. K. Allam}');
    expect(bib).toContain('journal = {ACS Applied Materials \\& Interfaces}');
  });

  it('braces a name containing "and" so it stays one author', () => {
    const bib = toBibtex([{ title: 'T', authors: 'Barnes and Noble Group, J. Smith' }]);
    expect(bib).toContain('author = {{Barnes and Noble Group} and J. Smith}');
  });

  it('keeps braces balanced whatever the title contains', () => {
    const bib = toBibtex([{ title: 'Odd } title { with }} braces', authors: 'A. B' }]);
    let depth = 0;
    for (let i = 0; i < bib.length; i++) {
      if (bib[i] === '\\') { i++; continue; }
      if (bib[i] === '{') depth++;
      if (bib[i] === '}') depth--;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });
});

describe('search', () => {
  it('matches every word across title, authors, journal and tags', () => {
    expect(pubs.filter((p) => matches(p, 'supercapacitors freeze')).length).toBeGreaterThan(0);
    expect(pubs.filter((p) => matches(p, 'Separations')).length).toBe(2);
    expect(pubs.filter((p) => matches(p, 'nonexistentword')).length).toBe(0);
    expect(pubs.filter((p) => matches(p, '  ')).length).toBe(pubs.length);
  });
});
