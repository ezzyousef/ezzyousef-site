import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mockReq, mockRes, SECRET } from './helpers.js';

/* An in-memory Blob store with the parts of @vercel/blob the API uses. */
const store = new Map();   // pathname -> { body, uploadedAt, url }
let clock = Date.parse('2026-11-16T10:00:00Z');
let seq = 0;
function save(pathname, body, opts = {}) {
  const p = opts.addRandomSuffix ? pathname.replace(/(\.[a-z]+)$/, `-r${++seq}$1`) : pathname;
  if (!opts.addRandomSuffix && store.has(p) && !opts.allowOverwrite) throw new Error('exists');
  const url = `https://blob.example/${p}`;
  store.set(p, { body: String(body), uploadedAt: new Date(clock += 1000), url, opts });
  return { url, pathname: p };
}
const blob = {
  put: vi.fn(async (pathname, body, opts) => save(pathname, body, opts)),
  copy: vi.fn(async (from, to, opts) => {
    const src = [...store.values()].find((b) => b.url === from) || store.get(from);
    return save(to, src.body, opts);
  }),
  list: vi.fn(async ({ prefix = '', limit = 1000 } = {}) => ({
    blobs: [...store.entries()].filter(([p]) => p.startsWith(prefix)).slice(0, limit)
      .map(([pathname, b]) => ({ pathname, url: b.url, uploadedAt: b.uploadedAt, size: b.body.length })),
  })),
  del: vi.fn(async (urls) => {
    for (const u of [].concat(urls)) for (const [p, b] of store) if (b.url === u) store.delete(p);
  }),
};
vi.mock('@vercel/blob', () => ({
  put: (...a) => blob.put(...a), copy: (...a) => blob.copy(...a),
  list: (...a) => blob.list(...a), del: (...a) => blob.del(...a),
}));

const hookCalls = [];
let hookStatus = 200;
globalThis.fetch = vi.fn(async (url) => {
  if (String(url).startsWith('https://hooks.example')) { hookCalls.push(url); return new Response('{}', { status: hookStatus }); }
  const b = [...store.values()].find((x) => x.url === url);
  return b ? new Response(b.body, { status: 200 }) : new Response('not found', { status: 404 });
});

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));

async function setup(env = {}) {
  vi.resetModules();
  Object.assign(process.env, { JWT_SECRET: SECRET, BLOB_READ_WRITE_TOKEN: 'test', DEPLOY_HOOK_URL: 'https://hooks.example/x' });
  delete process.env.VERCEL_ENV;
  delete process.env.ALLOW_PREVIEW_PUBLISH;
  Object.assign(process.env, env);
  const api = (await import('../../api/content.js')).default;
  const { signToken } = await import('../../api/_lib/auth.js');
  return { api, auth: { authorization: `Bearer ${await signToken()}` } };
}

async function call(api, opts) {
  const res = mockRes();
  await api(mockReq(opts), res);
  return res;
}

/** Publishes the way the dashboard does: against the revision it last saw. */
async function publish(api, auth, content, base) {
  if (base === undefined) {
    const live = (await call(api, { method: 'GET' })).body.content;
    base = (live && live.revision) || 0;
  }
  return call(api, { method: 'POST', headers: auth, body: { content, baseRevision: base } });
}

async function historyNames(api, auth) {
  const hist = await call(api, { method: 'GET', headers: auth, query: { history: '1' } });
  const names = [];
  for (const v of hist.body.versions) {
    names.push((await call(api, { method: 'GET', headers: auth, query: { version: v.id } })).body.content.hero.name);
  }
  return names;
}

const edited = (name) => { const c = structuredClone(seed); c.hero.name = name; return c; };

describe('content API', () => {
  beforeEach(() => { store.clear(); hookCalls.length = 0; hookStatus = 200; vi.useRealTimers(); vi.clearAllMocks(); });

  it('publishes valid content and serves it publicly', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    const res = await publish(api, auth, edited('A'));
    expect(res.statusCode).toBe(200);
    const got = await call(api, { method: 'GET' });
    expect(got.body.content.hero.name).toBe('A');
  });

  it('refuses to publish content that fails validation', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    const bad = edited('B');
    bad.contact.links[0].url = 'javascript:alert(1)';
    const res = await publish(api, auth, bad);
    expect(res.statusCode).toBe(400);
    expect(res.body.problems[0].path).toBe('contact.links.0.url');
    expect(store.has('content.json')).toBe(false);
  });

  it('keeps every published revision in history, immutably', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    await publish(api, auth, edited('First'));
    await publish(api, auth, edited('Second'));
    const hist = await call(api, { method: 'GET', headers: auth, query: { history: '1' } });
    expect(hist.statusCode).toBe(200);
    expect(hist.body.versions).toHaveLength(2);
    expect((await historyNames(api, auth)).sort()).toEqual(['First', 'Second']);
  });

  it('also archives a live document that predates revisions', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    save('content.json', JSON.stringify(edited('Legacy')), { allowOverwrite: true });
    await publish(api, auth, edited('New'), 0);
    expect((await historyNames(api, auth)).sort()).toEqual(['Legacy', 'New']);
  });

  it('caps history so storage does not grow without end', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    for (let i = 0; i < 35; i++) await publish(api, auth, edited('v' + i));
    const hist = await call(api, { method: 'GET', headers: auth, query: { history: '1' } });
    expect(hist.body.versions.length).toBe(30);
    const newest = await call(api, { method: 'GET', headers: auth, query: { version: hist.body.versions[0].id } });
    expect(newest.body.content.hero.name).toBe('v34');
  });

  it('rejects a publish made against an out-of-date revision with 409 and changes nothing', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    const first = await publish(api, auth, edited('A'), 0);
    expect(first.body.revision).toBe(1);
    const stale = await publish(api, auth, edited('B'), 0);
    expect(stale.statusCode).toBe(409);
    expect(stale.body.currentRevision).toBe(1);
    expect((await call(api, { method: 'GET' })).body.content.hero.name).toBe('A');
    expect((await publish(api, auth, edited('C'), 1)).body.revision).toBe(2);
  });

  it('requires the revision the editor was based on', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    const res = await call(api, { method: 'POST', headers: auth, body: { content: edited('A') } });
    expect(res.statusCode).toBe(400);
    expect(store.has('content.json')).toBe(false);
  });

  it('never loses a publish that raced another: every success is in history', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    const results = await Promise.all([publish(api, auth, edited('A'), 0), publish(api, auth, edited('B'), 0)]);
    const wanted = ['A', 'B'].filter((_, i) => results[i].statusCode === 200);
    expect(wanted.length).toBeGreaterThan(0);
    expect((await historyNames(api, auth)).sort()).toEqual(wanted);
  });

  it('keeps every draft when two saves race, and serves the latest pointer', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    const both = await Promise.all(['A', 'B'].map((n) =>
      call(api, { method: 'POST', headers: auth, body: { content: edited(n), stage: 'draft' } })));
    expect(both.map((r) => r.statusCode)).toEqual([200, 200]);
    const stored = [...store.keys()].filter((k) => k.startsWith('drafts/') && !k.endsWith('latest.json'));
    expect(stored).toHaveLength(2);
    const got = await call(api, { method: 'GET', headers: auth, query: { draft: '1' } });
    expect(['A', 'B']).toContain(got.body.draft.hero.name);
  });

  it('keeps preview drafts apart from production drafts', async () => {
    let { api, auth } = await setup({ VERCEL_ENV: 'preview' });
    await call(api, { method: 'POST', headers: auth, body: { content: edited('PreviewDraft'), stage: 'draft' } });
    ({ api, auth } = await setup({ VERCEL_ENV: 'production' }));
    expect((await call(api, { method: 'GET', headers: auth, query: { draft: '1' } })).body.draft).toBeNull();
    await call(api, { method: 'POST', headers: auth, body: { content: edited('ProdDraft'), stage: 'draft' } });
    ({ api, auth } = await setup({ VERCEL_ENV: 'preview' }));
    expect((await call(api, { method: 'GET', headers: auth, query: { draft: '1' } })).body.draft.hero.name).toBe('PreviewDraft');
  });

  it('refuses to store a malformed draft or publish', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    const bad = edited('X');
    bad.research.paragraphs = {};
    expect((await call(api, { method: 'POST', headers: auth, body: { content: bad, stage: 'draft' } })).statusCode).toBe(400);
    expect((await publish(api, auth, bad, 0)).statusCode).toBe(400);
    expect(store.size).toBe(0);
  });

  it('reports a failing deploy hook instead of calling it a success', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    hookStatus = 500;
    const res = await publish(api, auth, edited('A'));
    expect(res.statusCode).toBe(200);
    expect(res.body.rebuild.status).toBe('failed');
  });

  it('queues a trailing rebuild when one was requested recently, and runs it on retry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-16T10:00:00Z'));
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    expect((await publish(api, auth, edited('A'))).body.rebuild.status).toBe('requested');
    const second = await publish(api, auth, edited('B'));
    expect(second.body.rebuild.status).toBe('pending');
    expect(second.body.rebuild.retryAfter).toBeGreaterThan(0);
    expect(hookCalls).toHaveLength(1);
    const early = await call(api, { method: 'POST', headers: auth, body: { rebuild: true } });
    expect(early.body.rebuild.status).toBe('pending');
    vi.setSystemTime(new Date('2026-11-16T10:04:00Z'));
    const late = await call(api, { method: 'POST', headers: auth, body: { rebuild: true } });
    expect(late.body.rebuild.status).toBe('requested');
    expect(hookCalls).toHaveLength(2);
    const none = await call(api, { method: 'POST', headers: auth, body: { rebuild: true } });
    expect(none.body.rebuild.status).toBe('none-needed');
  });

  it('saves drafts without touching the live content', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    await publish(api, auth, edited('Live'));
    const d = await call(api, { method: 'POST', headers: auth, body: { content: edited('Draft'), stage: 'draft' } });
    expect(d.statusCode).toBe(200);
    expect((await call(api, { method: 'GET' })).body.content.hero.name).toBe('Live');
    const got = await call(api, { method: 'GET', headers: auth, query: { draft: '1' } });
    expect(got.body.draft.hero.name).toBe('Draft');
  });

  it('keeps drafts, history and versions away from visitors', async () => {
    const { api } = await setup({ VERCEL_ENV: 'production' });
    for (const q of [{ draft: '1' }, { history: '1' }, { version: 'history/x.json' }]) {
      expect((await call(api, { method: 'GET', query: q })).statusCode).toBe(401);
    }
  });

  it('only reads versions from the history folder', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    const res = await call(api, { method: 'GET', headers: auth, query: { version: 'content.json' } });
    expect(res.statusCode).toBe(400);
  });

  it('refuses to publish from a preview deployment, which shares the production store', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'preview' });
    const res = await publish(api, auth, edited('Preview'));
    expect(res.statusCode).toBe(403);
    expect(store.has('content.json')).toBe(false);
    expect(hookCalls).toHaveLength(0);
    // drafts are fine from a preview
    const d = await call(api, { method: 'POST', headers: auth, body: { content: edited('P'), stage: 'draft' } });
    expect(d.statusCode).toBe(200);
  });

  it('allows a preview to publish only when the owner opts in, and never fires the deploy hook there', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'preview', ALLOW_PREVIEW_PUBLISH: '1' });
    const res = await publish(api, auth, edited('P'));
    expect(res.statusCode).toBe(200);
    expect(hookCalls).toHaveLength(0);
  });

  it('fires the deploy hook after a production publish', async () => {
    const { api, auth } = await setup({ VERCEL_ENV: 'production' });
    await publish(api, auth, edited('Prod'));
    expect(hookCalls).toHaveLength(1);
  });

  it('refuses unsigned writes', async () => {
    const { api } = await setup({ VERCEL_ENV: 'production' });
    const res = await call(api, { method: 'POST', headers: {}, body: { content: edited('X') } });
    expect(res.statusCode).toBe(401);
  });
});
