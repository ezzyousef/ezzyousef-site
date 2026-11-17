import { describe, it, expect } from 'vitest';
import { stillDirty, publishMessage, withLiveRevision } from '../../src/lib/publish-state.js';

describe('dirty tracking', () => {
  it('clears the unsaved flag only when nothing changed after the submitted snapshot', () => {
    expect(stillDirty(5, 5)).toBe(false);
    expect(stillDirty(5, 6)).toBe(true);
  });
});

describe('publish message', () => {
  it('says the site is updated only when the rebuild was requested', () => {
    expect(publishMessage({ status: 'requested' })).toMatchObject({ kind: 'ok', msg: expect.stringMatching(/rebuild requested/i) });
  });
  it('says plainly that the rebuild is pending, with a retry delay', () => {
    const m = publishMessage({ status: 'pending', retryAfter: 90 });
    expect(m.msg).toMatch(/saved/i);
    expect(m.msg).toMatch(/pending/i);
    expect(m.retryMs).toBe(90000);
  });
  it('says the rebuild failed without calling the publish a failure', () => {
    const m = publishMessage({ status: 'failed', message: 'refused (500)' });
    expect(m.msg).toMatch(/saved/i);
    expect(m.msg).toMatch(/failed/i);
    expect(m.kind).toBe('bad');
  });
  it('copes with a missing status', () => {
    expect(publishMessage(undefined).msg).toMatch(/saved/i);
  });
});

describe('live revision', () => {
  it('keeps the live revision when a draft or old version is loaded', () => {
    expect(withLiveRevision({ a: 1, revision: 2 }, { revision: 9 })).toEqual({ a: 1, revision: 9 });
    expect(withLiveRevision({ a: 1, revision: 2 }, {})).toEqual({ a: 1 });
  });
});
