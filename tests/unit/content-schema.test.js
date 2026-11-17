import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { migrate, validate, doiFromUrl, SCHEMA_VERSION } from '../../src/lib/content-schema.js';

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));

/** Every leaf path in a document, for "nothing was lost" checks. */
function leaves(v, path = '', out = new Map()) {
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) leaves(v[k], path ? `${path}.${k}` : k, out);
  } else out.set(path, v);
  return out;
}

describe('migrate', () => {
  it('keeps every field of a document saved before this version', () => {
    const old = structuredClone(seed);
    delete old.schemaVersion;
    const before = leaves(old);
    const after = leaves(migrate(old));
    for (const [path, value] of before) expect(after.get(path), path).toEqual(value);
    expect(migrate(old).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('adds the new fields with empty defaults', () => {
    const m = migrate(seed);
    expect(m.blocks).toEqual([]);
    expect(m.profile).toEqual({ orcid: '', cvUrl: '' });
    const pr = m.software.projects[0];
    expect(pr.downloads).toEqual([]);
    expect(pr.status).toBe('');
    expect(pr.license).toBe('');
  });

  it('reads the DOI out of doi.org links and leaves other links alone', () => {
    const m = migrate(seed);
    const byUrl = Object.fromEntries(m.publications.items.map((p) => [p.url, p.doi]));
    expect(byUrl['https://doi.org/10.1016/j.cej.2026.176245']).toBe('10.1016/j.cej.2026.176245');
    expect(byUrl['https://www.mdpi.com/2297-8739/10/6/337']).toBe('');
  });

  it('is idempotent and does not touch its input', () => {
    const copy = structuredClone(seed);
    const once = migrate(copy);
    expect(migrate(once)).toEqual(once);
    expect(copy).toEqual(seed);
  });

  it('never overwrites a value the owner already set', () => {
    const doc = structuredClone(seed);
    doc.software.projects[0].license = 'MIT';
    doc.publications.items[0].doi = '10.9/own';
    const m = migrate(doc);
    expect(m.software.projects[0].license).toBe('MIT');
    expect(m.publications.items[0].doi).toBe('10.9/own');
  });
});

describe('validate', () => {
  it('accepts the shipped content, before and after migration', () => {
    expect(validate(seed)).toEqual([]);
    expect(validate(migrate(seed))).toEqual([]);
  });

  it('refuses a font name that would break out of the stylesheet', () => {
    const doc = migrate(seed);
    doc.theme.fontBody = 'Archivo"; } body { display: none } x {"';
    expect(validate(doc).map((e) => e.path)).toContain('theme.fontBody');
  });

  it('refuses colours that are not plain hex', () => {
    const doc = migrate(seed);
    doc.theme.accent = 'red; background: url(//evil)';
    expect(validate(doc).map((e) => e.path)).toContain('theme.accent');
  });

  it('refuses unsafe links anywhere in the document', () => {
    const doc = migrate(seed);
    doc.contact.links[0].url = 'javascript:alert(1)';
    doc.research.figures[0].src = 'data:image/svg+xml,<svg onload=alert(1)>';
    doc.software.projects[0].downloads = [{ label: 'x', url: 'vbscript:x', platform: '' }];
    const paths = validate(doc).map((e) => e.path);
    expect(paths).toContain('contact.links.0.url');
    expect(paths).toContain('research.figures.0.src');
    expect(paths).toContain('software.projects.0.downloads.0.url');
  });

  it('refuses out-of-range sizes, missing sections and odd statuses', () => {
    const doc = migrate(seed);
    doc.theme.baseSize = 400;
    delete doc.hero;
    doc.software.projects[1].status = 'shipping soon!';
    const paths = validate(doc).map((e) => e.path);
    expect(paths).toEqual(expect.arrayContaining(['theme.baseSize', 'hero', 'software.projects.1.status']));
  });

  it('refuses prototype keys', () => {
    const doc = JSON.parse(JSON.stringify(migrate(seed)).replace('"meta":{', '"meta":{"__proto__":{"x":1},'));
    expect(validate(doc).map((e) => e.path)).toContain('meta.__proto__');
  });

  it('is not an object', () => {
    expect(validate(null)).toHaveLength(1);
    expect(validate([])).toHaveLength(1);
  });
});

describe('doiFromUrl', () => {
  it.each([
    ['https://doi.org/10.1039/D6TA00216A', '10.1039/D6TA00216A'],
    ['http://dx.doi.org/10.1002/app.55831', '10.1002/app.55831'],
    ['https://example.org/10.1/x', ''],
    [undefined, ''],
  ])('%s -> %s', (u, d) => expect(doiFromUrl(u)).toBe(d));
});
