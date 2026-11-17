/**
 * The content document's version, migration and validation.
 *
 * Shared by the dashboard (to warn before publishing), the server (to refuse
 * a bad save) and the build. Migration only ever adds fields with empty
 * defaults; it never removes or rewrites what the owner wrote, so a document
 * saved before this version keeps every field.
 */
import { isSafeUrl } from './safe-url.js';
import { FONTS } from '../theme.js';

export const SCHEMA_VERSION = 2;

const PROJECT_DEFAULTS = {
  status: '',          // '', 'released', 'beta', 'in development', 'unpublished', 'archived'
  platforms: [],
  version: '',
  channel: '',
  license: '',
  docsUrl: '',
  changelogUrl: '',
  downloads: [],       // [{ label, url, platform }]
  detail: [],          // extra paragraphs for the project's own page
};

export const PROJECT_STATUSES = ['', 'released', 'beta', 'in development', 'unpublished', 'archived'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The DOI inside a doi.org link, or '' when the link is not a DOI link. */
export function doiFromUrl(url) {
  const m = /^https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/\S+)$/i.exec(String(url || '').trim());
  return m ? decodeURIComponent(m[1]) : '';
}

/** Returns a migrated copy; the input is not modified. Idempotent. */
export function migrate(input) {
  if (!isObj(input)) return input;
  const doc = structuredClone(input);
  const from = Number(doc.schemaVersion) || 1;
  if (from < 2) {
    doc.profile = isObj(doc.profile) ? doc.profile : {};
    if (doc.profile.orcid === undefined) doc.profile.orcid = '';
    if (doc.profile.cvUrl === undefined) doc.profile.cvUrl = '';
    if (!Array.isArray(doc.blocks)) doc.blocks = [];
    if (isObj(doc.publications) && Array.isArray(doc.publications.items)) {
      doc.publications.items = doc.publications.items.map((p) => {
        if (!isObj(p)) return p;
        const out = { ...p };
        if (out.doi === undefined) out.doi = doiFromUrl(out.url);
        if (out.year === undefined) out.year = '';
        return out;
      });
    }
    if (isObj(doc.software) && Array.isArray(doc.software.projects)) {
      doc.software.projects = doc.software.projects.map((pr) =>
        (isObj(pr) ? { ...structuredClone(PROJECT_DEFAULTS), ...pr } : pr));
    }
  }
  doc.schemaVersion = Math.max(from, SCHEMA_VERSION);
  return doc;
}

const COLOUR_KEYS = ['accent', 'accentDark', 'ground', 'surface', 'ink', 'muted', 'hair'];
const SIZES = { baseSize: [12, 24], heroSize: [28, 120], headingSize: [18, 72], radius: [0, 40] };
const SECTIONS = ['theme', 'meta', 'hero', 'research', 'publications', 'software', 'experience', 'background', 'contact', 'footer'];
const URL_KEY = /^(url|href|src|portrait)$|Url$/;
const MAX_STRING = 20000;
const MAX_ARRAY = 500;

/**
 * Returns a list of { path, message }. Empty means the document can be saved.
 */
export function validate(doc) {
  const errors = [];
  const err = (path, message) => errors.push({ path, message });
  if (!isObj(doc)) return [{ path: '', message: 'Content must be an object.' }];

  for (const s of SECTIONS) if (!isObj(doc[s])) err(s, `The "${s}" section is missing.`);
  if (doc.nav !== undefined && !Array.isArray(doc.nav)) err('nav', 'Navigation must be a list.');

  const t = isObj(doc.theme) ? doc.theme : {};
  for (const k of COLOUR_KEYS) {
    if (t[k] !== undefined && !/^#[0-9a-f]{6}$/i.test(String(t[k]))) err(`theme.${k}`, 'Use a colour like #1A2B3C.');
  }
  for (const [k, list] of [['fontDisplay', FONTS.display], ['fontBody', FONTS.body], ['fontMono', FONTS.mono]]) {
    if (t[k] !== undefined && !list.includes(t[k])) err(`theme.${k}`, `Choose one of the offered fonts.`);
  }
  for (const [k, [lo, hi]] of Object.entries(SIZES)) {
    if (t[k] !== undefined && !(typeof t[k] === 'number' && Number.isFinite(t[k]) && t[k] >= lo && t[k] <= hi)) {
      err(`theme.${k}`, `Use a number from ${lo} to ${hi}.`);
    }
  }

  for (const [i, n] of (Array.isArray(doc.nav) ? doc.nav : []).entries()) {
    if (!isObj(n) || typeof n.href !== 'string' || !/^[#/]/.test(n.href)) err(`nav.${i}.href`, 'A navigation target starts with # or /.');
  }

  if (isObj(doc.software) && Array.isArray(doc.software.projects)) {
    doc.software.projects.forEach((pr, i) => {
      if (isObj(pr) && pr.status !== undefined && !PROJECT_STATUSES.includes(pr.status)) {
        err(`software.projects.${i}.status`, `Status must be one of: ${PROJECT_STATUSES.filter(Boolean).join(', ')}.`);
      }
    });
  }

  // Every string, every link, every list size.
  const walk = (v, path, key) => {
    if (typeof v === 'string') {
      if (v.length > MAX_STRING) err(path, `Text is longer than ${MAX_STRING} characters.`);
      if (key && URL_KEY.test(key) && v.trim() && !isSafeUrl(v)) {
        err(path, 'Links must start with https://, http://, mailto:, tel:, / or #.');
      }
      return;
    }
    if (Array.isArray(v)) {
      if (v.length > MAX_ARRAY) err(path, `A list may hold at most ${MAX_ARRAY} entries.`);
      v.forEach((x, i) => walk(x, `${path}.${i}`, key));
      return;
    }
    if (isObj(v)) {
      for (const k of Object.keys(v)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') { err(`${path}.${k}`, 'Reserved key.'); continue; }
        walk(v[k], path ? `${path}.${k}` : k, k);
      }
    }
  };
  walk(doc, '', '');
  return errors;
}
