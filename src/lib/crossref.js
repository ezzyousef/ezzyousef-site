/**
 * DOI and ORCID lookups for the dashboard.
 *
 * These run in the owner's browser, only when the owner presses a lookup
 * button, and send nothing but the DOI or ORCID iD to the public Crossref and
 * ORCID APIs. Results are only ever proposals: the dashboard shows each field
 * next to the current value and changes nothing until the owner applies it.
 * Citation counts and impact factors are deliberately not read.
 */

export const CROSSREF = 'https://api.crossref.org/works/';
export const ORCID = 'https://pub.orcid.org/v3.0/';

/** "https://doi.org/10.1/X", "doi:10.1/X" or "10.1/X" -> "10.1/X"; '' if not a DOI. */
export function normalizeDoi(input) {
  const s = String(input || '').trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  return /^10\.\d{4,9}\/\S+$/.test(s) ? s : '';
}

/** ORCID iD format and its ISO 7064 11,2 check digit. */
export function isOrcid(id) {
  const s = String(id || '').trim();
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(s)) return false;
  const digits = s.replace(/-/g, '');
  let total = 0;
  for (let i = 0; i < 15; i++) total = (total + Number(digits[i])) * 2;
  const r = (12 - (total % 11)) % 11;
  return digits[15] === (r === 10 ? 'X' : String(r));
}

const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻' };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Crossref titles carry JATS markup ("CO<sub>2</sub>"). Plain text out,
 *  with numeric sub- and superscripts kept as Unicode characters. */
export function plainTitle(s) {
  return String(s || '')
    .replace(/<sub>([0-9]+)<\/sub>/gi, (_, d) => [...d].map((c) => SUB[c]).join(''))
    .replace(/<sup>([0-9+-]+)<\/sup>/gi, (_, d) => [...d].map((c) => SUP[c]).join(''))
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
      }
      return ENT[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Ezzeldien Muhammed" + "Yousef" -> "E. M. Yousef", the style the page uses. */
function shortName(a) {
  if (!a) return '';
  if (!a.family) return String(a.name || a.given || '').trim();
  const initials = String(a.given || '')
    .split(/[\s]+/).filter(Boolean)
    .map((part) => part.split('-').map((x) => (x ? x[0].toUpperCase() + '.' : '')).join('-'))
    .join(' ');
  return [initials, a.family].filter(Boolean).join(' ');
}

/** A Crossref "message" -> the publication fields the page uses. */
export function pubFromCrossref(msg) {
  const m = msg || {};
  const doi = normalizeDoi(m.DOI);
  const parts = (m.issued && m.issued['date-parts'] && m.issued['date-parts'][0]) ||
    (m['published-print'] && m['published-print']['date-parts'] && m['published-print']['date-parts'][0]) ||
    (m['published-online'] && m['published-online']['date-parts'] && m['published-online']['date-parts'][0]) || [];
  return {
    title: plainTitle((m.title || [])[0]),
    authors: (m.author || []).map(shortName).filter(Boolean).join(', '),
    journal: plainTitle((m['container-title'] || [])[0]),
    year: parts[0] ? String(parts[0]) : '',
    doi,
    url: doi ? `https://doi.org/${doi}` : '',
  };
}

const FIELDS = ['title', 'authors', 'journal', 'year', 'doi', 'url'];

/** Field-by-field differences worth showing. Empty proposals are skipped, so
 *  a lookup can never blank a field the owner filled in. */
export function diffPub(current, proposed) {
  return FIELDS
    .filter((f) => proposed[f] && String(proposed[f]) !== String((current && current[f]) || ''))
    .map((f) => ({ field: f, from: (current && current[f]) || '', to: proposed[f] }));
}

/** Applies only the fields the owner ticked. */
export function applyFields(current, proposed, fields) {
  const out = { ...current };
  for (const f of fields) if (FIELDS.includes(f) && proposed[f]) out[f] = proposed[f];
  return out;
}

export async function lookupDoi(doi, fetchImpl = fetch) {
  const d = normalizeDoi(doi);
  if (!d) throw new Error('That does not look like a DOI (it should start with 10.).');
  const r = await fetchImpl(CROSSREF + encodeURIComponent(d), { headers: { Accept: 'application/json' } });
  if (r.status === 404) throw new Error('Crossref has no record of that DOI.');
  if (!r.ok) throw new Error(`Crossref did not answer (${r.status}). Try again later.`);
  const body = await r.json();
  return pubFromCrossref(body && body.message);
}

/** Every DOI listed on an ORCID record. */
export function doisFromOrcidWorks(body) {
  const out = new Set();
  for (const g of (body && body.group) || []) {
    for (const id of (g['external-ids'] && g['external-ids']['external-id']) || []) {
      if (String(id['external-id-type']).toLowerCase() === 'doi') {
        const d = normalizeDoi(id['external-id-value']);
        if (d) out.add(d.toLowerCase());
      }
    }
  }
  return [...out];
}

export async function lookupOrcidDois(orcid, fetchImpl = fetch) {
  if (!isOrcid(orcid)) throw new Error('That is not a valid ORCID iD (0000-0000-0000-0000).');
  const r = await fetchImpl(`${ORCID}${orcid.trim()}/works`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`ORCID did not answer (${r.status}). Try again later.`);
  return doisFromOrcidWorks(await r.json());
}

/** DOIs on the ORCID record that the page does not list yet. */
export function missingDois(dois, items, doiOf) {
  const have = new Set((items || []).map((p) => doiOf(p).toLowerCase()).filter(Boolean));
  return dois.filter((d) => !have.has(d.toLowerCase()));
}
