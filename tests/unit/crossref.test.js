import { describe, it, expect, vi } from 'vitest';
import {
  normalizeDoi, isOrcid, plainTitle, pubFromCrossref, diffPub, applyFields,
  lookupDoi, doisFromOrcidWorks, lookupOrcidDois, missingDois,
} from '../../src/lib/crossref.js';
import { doiOf } from '../../src/lib/citation.js';

// Shaped like a Crossref /works/{doi} response (fields trimmed); not live data.
const CROSSREF_MSG = {
  DOI: '10.1021/ACSAMI.5C20454',
  title: ['Tuning C–C Coupling and Selectivity in the CO<sub>2</sub> Electrochemical Reduction Reaction via Pyramidal Dilute Sn–Cu Alloy'],
  author: [
    { given: 'Ahmed A.', family: 'Ashour' },
    { given: 'Ezz-Eldien', family: 'Yousef' },
    { name: 'Some Consortium' },
  ],
  'container-title': ['ACS Applied Materials &amp; Interfaces'],
  issued: { 'date-parts': [[2026, 1, 12]] },
  'is-referenced-by-count': 7,
};

describe('DOI and ORCID formats', () => {
  it.each([
    ['https://doi.org/10.1234/abc', '10.1234/abc'], ['doi: 10.1234/x.y', '10.1234/x.y'],
    ['10.12345/ABC', '10.12345/ABC'], ['11.1/x', ''], ['', ''], ['https://example.org', ''],
  ])('normalizeDoi(%j) = %j', (a, b) => expect(normalizeDoi(a)).toBe(b));

  it('checks the ORCID check digit', () => {
    expect(isOrcid('0000-0002-1825-0097')).toBe(true);   // ORCID's documented example
    expect(isOrcid('0000-0002-1694-233X')).toBe(true);
    expect(isOrcid('0000-0002-1825-0098')).toBe(false);
    expect(isOrcid('0000-0002-1825')).toBe(false);
  });
});

describe('Crossref parsing', () => {
  it('turns JATS markup into plain text with Unicode subscripts', () => {
    expect(plainTitle('CO<sub>2</sub> and Li<sup>+</sup> in <i>situ</i> &amp; more')).toBe('CO₂ and Li⁺ in situ & more');
  });

  it('maps a record to the page\'s fields and ignores citation counts', () => {
    const p = pubFromCrossref(CROSSREF_MSG);
    expect(p).toEqual({
      title: 'Tuning C–C Coupling and Selectivity in the CO₂ Electrochemical Reduction Reaction via Pyramidal Dilute Sn–Cu Alloy',
      authors: 'A. A. Ashour, E.-E. Yousef, Some Consortium',
      journal: 'ACS Applied Materials & Interfaces',
      year: '2026',
      doi: '10.1021/ACSAMI.5C20454',
      url: 'https://doi.org/10.1021/ACSAMI.5C20454',
    });
    expect(JSON.stringify(p)).not.toContain('7');
  });

  it('proposes only fields that differ and are not empty, and applies only ticked fields', () => {
    const current = { title: 'Old', authors: 'A', journal: '', year: '', doi: '', url: 'https://x', tags: ['Q1'] };
    const proposed = { title: 'New', authors: 'A', journal: 'J', year: '', doi: '10.1/x', url: '' };
    const d = diffPub(current, proposed);
    expect(d.map((x) => x.field)).toEqual(['title', 'journal', 'doi']);
    const out = applyFields(current, proposed, ['journal', 'doi', 'tags']);
    expect(out).toEqual({ ...current, journal: 'J', doi: '10.1/x' });
  });

  it('looks up through the given fetch and explains failures', async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ message: CROSSREF_MSG }), { status: 200 }));
    const p = await lookupDoi('https://doi.org/10.1021/acsami.5c20454', ok);
    expect(ok.mock.calls[0][0]).toBe('https://api.crossref.org/works/10.1021%2Facsami.5c20454');
    expect(p.year).toBe('2026');
    await expect(lookupDoi('10.1234/x', async () => new Response('', { status: 404 }))).rejects.toThrow(/no record/);
    await expect(lookupDoi('nope', ok)).rejects.toThrow(/DOI/);
  });
});

describe('ORCID import', () => {
  // Shaped like an ORCID v3.0 /works response (trimmed); not live data.
  const WORKS = { group: [
    { 'external-ids': { 'external-id': [{ 'external-id-type': 'doi', 'external-id-value': '10.1016/J.CEJ.2026.176245' }] } },
    { 'external-ids': { 'external-id': [{ 'external-id-type': 'doi', 'external-id-value': 'https://doi.org/10.9999/new.paper' }, { 'external-id-type': 'eid', 'external-id-value': '2-s2.0-1' }] } },
    { 'external-ids': { 'external-id': [] } },
  ] };

  it('lists DOIs and finds the ones the page lacks', async () => {
    const dois = doisFromOrcidWorks(WORKS);
    expect(dois).toEqual(['10.1016/j.cej.2026.176245', '10.9999/new.paper']);
    const items = [{ url: 'https://doi.org/10.1016/j.cej.2026.176245' }];
    expect(missingDois(dois, items, doiOf)).toEqual(['10.9999/new.paper']);
  });

  it('refuses a malformed iD before any request', async () => {
    const f = vi.fn();
    await expect(lookupOrcidDois('1234', f)).rejects.toThrow(/ORCID/);
    expect(f).not.toHaveBeenCalled();
    const ok = vi.fn(async () => new Response(JSON.stringify(WORKS)));
    await lookupOrcidDois('0000-0002-1825-0097', ok);
    expect(ok.mock.calls[0][0]).toBe('https://pub.orcid.org/v3.0/0000-0002-1825-0097/works');
  });
});
