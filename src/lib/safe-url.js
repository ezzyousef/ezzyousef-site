/**
 * Link safety shared by the page, the static prerender and the server-side
 * content check. Only schemes a visitor can follow without running code are
 * allowed: http, https, mailto, tel, site-relative paths and in-page anchors.
 */
const ALLOWED = /^(https?:|mailto:|tel:)/i;

export function isSafeUrl(url) {
  if (typeof url !== 'string') return false;
  // Browsers ignore control characters and leading spaces when they read a
  // scheme, so "java\tscript:" and " javascript:" must be judged as stripped.
  // eslint-disable-next-line no-control-regex
  const u = url.replace(/[\u0000- \u007f-\u009f]/g, '');
  if (!u) return false;
  if (u.startsWith('#')) return true;
  if (u.startsWith('/') && !u.startsWith('//') && !u.startsWith('/\\')) return true;
  return ALLOWED.test(u);
}

/** The URL if it is safe to put in an href, otherwise undefined (no link). */
export function safeHref(url) {
  return isSafeUrl(url) ? url.trim() : undefined;
}

export const isExternal = (url) => /^https?:/i.test(String(url || '').trim());
