import { describe, it, expect } from 'vitest';
import { isSafeUrl, safeHref } from '../../src/lib/safe-url.js';

describe('isSafeUrl', () => {
  it.each([
    'https://doi.org/10.1/x', 'http://example.org', 'mailto:a@b.c', 'tel:+1555',
    '/assets/a.png', '#research', 'HTTPS://EXAMPLE.ORG',
  ])('allows %s', (u) => expect(isSafeUrl(u)).toBe(true));

  it.each([
    'javascript:alert(1)', ' javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)',
    'java\nscript:x', 'data:text/html,hi', 'vbscript:x', '//evil.example/x', '/\\evil.example',
    'file:///c:/x', '', '   ', null, undefined, 42, 'relative/path',
  ])('refuses %j', (u) => expect(isSafeUrl(u)).toBe(false));

  it('returns undefined for unsafe links so no href is written', () => {
    expect(safeHref('javascript:x')).toBeUndefined();
    expect(safeHref(' https://a.b ')).toBe('https://a.b');
  });
});
