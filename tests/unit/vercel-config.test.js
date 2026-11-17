import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync('vercel.json', 'utf8'));
const viteCfg = readFileSync('vite.config.js', 'utf8');

/** The headers Vercel would send for a path: every matching rule, later rules winning. */
function headersFor(path) {
  const out = {};
  for (const rule of cfg.headers) {
    const re = new RegExp('^' + rule.source.replace(/\(\.\*\)/g, '.*') + '$');
    if (re.test(path)) for (const h of rule.headers) out[h.key.toLowerCase()] = h.value;
  }
  return out;
}

function csp() {
  const value = headersFor('/')['content-security-policy'];
  expect(value, 'Content-Security-Policy header').toBeTruthy();
  return Object.fromEntries(value.split(';').map((d) => d.trim()).filter(Boolean)
    .map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v]; }));
}

describe('security headers', () => {
  it('sends a Content-Security-Policy that only runs the site\'s own scripts', () => {
    const p = csp();
    expect(p['default-src']).toEqual(["'self'"]);
    expect(p['script-src']).toEqual(["'self'"]);
    expect(p['object-src']).toEqual(["'none'"]);
    expect(p['frame-ancestors']).toEqual(["'none'"]);
    expect(p['base-uri']).toEqual(["'self'"]);
    expect(p['form-action']).toEqual(["'self'"]);
    const all = Object.values(p).flat();
    expect(all).not.toContain("'unsafe-eval'");
    expect(p['script-src']).not.toContain("'unsafe-inline'");
    expect(p['script-src']).not.toContain('*');
  });

  it('lets the page reach only what it uses: fonts and the metadata services', () => {
    const p = csp();
    expect(p['font-src']).toContain('https://fonts.gstatic.com');
    expect(p['style-src']).toContain('https://fonts.googleapis.com');
    expect(p['connect-src']).toEqual(["'self'", 'https://api.crossref.org', 'https://pub.orcid.org']);
  });

  it('keeps the other protective headers on every path', () => {
    for (const path of ['/', '/software/aerolab-studio/', '/api/content', '/assets/portrait.jpg']) {
      const h = headersFor(path);
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['x-frame-options']).toBe('DENY');
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(h['permissions-policy']).toMatch(/camera=\(\)/);
      expect(h['content-security-policy']).toBeTruthy();
    }
  });
});

describe('caching', () => {
  it('serves the content-hashed bundle forever, but not the replaceable images', () => {
    expect(viteCfg).toMatch(/assetsDir:\s*'_app'/);
    expect(headersFor('/_app/index-abc123.js')['cache-control']).toMatch(/immutable/);
    const img = headersFor('/assets/portrait.jpg')['cache-control'];
    expect(img).not.toMatch(/immutable/);
    expect(img).toMatch(/max-age=86400/);
  });

  it('always revalidates pages', () => {
    for (const path of ['/', '/index.html', '/software/x/']) {
      expect(headersFor(path)['cache-control']).toMatch(/max-age=0/);
    }
  });
});

describe('routing', () => {
  it('does not send every unknown path to the home page, so the 404 page is used', () => {
    const catchAll = (cfg.rewrites || []).find((r) => r.source === '/(.*)');
    expect(catchAll).toBeUndefined();
  });
});
