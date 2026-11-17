/**
 * Citation text and BibTeX for the publication list. Everything here is built
 * from the content the owner entered; nothing is looked up.
 */
import { doiFromUrl } from './content-schema.js';

export const doiOf = (p) => String((p && (p.doi || doiFromUrl(p.url))) || '').trim();

/** Authors as written on the page, minus joint-first-author asterisks. */
export function authorList(p) {
  return String((p && p.authors) || '')
    .split(',')
    .map((a) => a.replace(/\*/g, '').trim())
    .filter(Boolean);
}

/** One line, the way it would be pasted into a reference list. */
export function citationText(p) {
  const doi = doiOf(p);
  const link = doi ? `https://doi.org/${doi}` : (p.url || '');
  const authors = authorList(p).join(', ');
  const head = [authors, p.year ? `(${p.year})` : ''].filter(Boolean).join(' ');
  const bits = [head, p.title, p.journal].filter(Boolean).map((s) => String(s).replace(/[.\s]+$/, ''));
  return bits.join('. ') + '.' + (link ? ` ${link}` : '');
}

const BIB_SPECIAL = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' };

/** Escapes characters that mean something to BibTeX/LaTeX. */
export function bibEscape(s) {
  return String(s ?? '').replace(/[\\{}&%$#_~^]/g, (ch) => BIB_SPECIAL[ch]);
}

/** A BibTeX name. "and" inside a name would split it into two authors, so
 *  such a name is braced whole. */
function bibName(name) {
  const n = bibEscape(name);
  return /\band\b/i.test(name) ? `{${n}}` : n;
}

function keyBase(p) {
  const first = authorList(p)[0] || 'anon';
  const last = first.split(/\s+/).pop().normalize('NFKD').replace(/[^A-Za-z]/g, '').toLowerCase() || 'anon';
  const word = String(p.title || '').normalize('NFKD').split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, '').toLowerCase())
    .find((w) => w.length > 3) || 'paper';
  return `${last}${p.year || ''}${word}`;
}

/** BibTeX for a list of papers, with unique keys. */
export function toBibtex(items) {
  const used = new Map();
  return (items || []).map((p) => {
    const base = keyBase(p);
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    const key = n === 1 ? base : `${base}${String.fromCharCode(96 + n)}`;
    const doi = doiOf(p);
    const fields = [
      ['title', `{${bibEscape(p.title)}}`],
      ['author', `{${authorList(p).map(bibName).join(' and ')}}`],
      ['journal', p.journal ? `{${bibEscape(p.journal)}}` : ''],
      ['year', p.year ? `{${bibEscape(p.year)}}` : ''],
      ['doi', doi ? `{${bibEscape(doi)}}` : ''],
      ['url', p.url ? `{${bibEscape(p.url)}}` : ''],
    ].filter(([, v]) => v);
    return `@article{${key},\n${fields.map(([k, v]) => `  ${k} = ${v}`).join(',\n')}\n}`;
  }).join('\n\n') + '\n';
}

/** Case-insensitive search over title, authors, journal, tags and year. */
export function matches(p, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [p.title, p.authors, p.journal, p.year, doiOf(p), ...(p.tags || [])].join(' ').toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}
