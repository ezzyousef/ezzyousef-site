import { describe, it, expect } from 'vitest';
import { parseBackup, backupName } from '../../src/lib/backup.js';

const good = { schemaVersion: 2, theme: {}, meta: {}, hero: {}, research: {}, publications: {}, software: {}, experience: {}, background: {}, contact: {}, footer: {} };

describe('backup import', () => {
  it('accepts a valid document', () => {
    const r = parseBackup(JSON.stringify(good));
    expect(r.error).toBeNull();
    expect(r.content.schemaVersion).toBe(2);
  });
  it('migrates an old document', () => {
    const { schemaVersion, ...old } = good; void schemaVersion;
    expect(parseBackup(JSON.stringify(old)).content.schemaVersion).toBe(2);
  });
  it('refuses text that is not JSON', () => {
    expect(parseBackup('nope').error).toMatch(/JSON/);
  });
  it('refuses a document with problems', () => {
    const r = parseBackup(JSON.stringify({ ...good, theme: { accent: 'red' } }));
    expect(r.content).toBeNull();
    expect(r.error).toMatch(/theme\.accent/);
  });
  it('refuses a document that is not an object', () => {
    expect(parseBackup('[1]').error).toBeTruthy();
  });
  it('names backups by date', () => {
    expect(backupName(new Date('2026-03-04T05:06:07Z'))).toBe('site-content-2026-03-04.json');
  });
});
