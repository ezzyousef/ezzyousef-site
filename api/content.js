import { list, put, copy, del } from '@vercel/blob';
import { isAdmin, rateLimited, clientIp } from './_lib/auth.js';
import { migrate, validate } from '../src/lib/content-schema.js';

/**
 * The content document.
 *
 *   GET                      public: the published content
 *   GET ?draft=1             owner:  the saved draft, if any
 *   GET ?history=1           owner:  earlier published versions, newest first
 *   GET ?version=<id>        owner:  one earlier version
 *   POST { content }                  owner: validate, archive the live copy, publish
 *   POST { content, stage: 'draft' }  owner: save a draft; the live site is untouched
 *
 * Storage layout in Vercel Blob:
 *   content.json             the live document (public, fixed name, as before)
 *   drafts/content-*.json    the latest draft (random suffix, so the URL cannot be guessed)
 *   history/content-*.json   up to HISTORY_KEEP earlier versions (random suffix)
 *
 * Preview deployments share the production Blob store and environment, so a
 * preview's dashboard could overwrite the live site. Publishing is refused
 * there unless ALLOW_PREVIEW_PUBLISH=1; drafts are allowed.
 */

const KEY = 'content.json';
const DRAFTS = 'drafts/';
const HISTORY = 'history/';
const HISTORY_KEEP = 30;
const MARKER = 'deploy-marker.json';
const MIN_GAP_MS = 3 * 60 * 1000;
const MAX_BYTES = 2_000_000;

const isProduction = () => process.env.VERCEL_ENV === 'production';
const isPreview = () => !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production';

/**
 * A save changes the content in storage, but the build still carries a copy
 * baked in at deploy time. Asking for a rebuild here keeps that copy current.
 * Only production asks: a preview must never rebuild the live site.
 *
 * Fire and forget: a failure here must never fail the save. Rebuilds are
 * spaced out so a burst of edits cannot start a queue of builds.
 */
async function requestRebuild() {
  const hook = process.env.DEPLOY_HOOK_URL;
  if (!hook) return 'no hook configured';
  if (!isProduction()) return 'not production; no rebuild requested';
  try {
    let last = 0;
    const { blobs } = await list({ prefix: MARKER, limit: 1 });
    const hit = blobs.find((b) => b.pathname === MARKER);
    if (hit) {
      const r = await fetch(hit.url, { cache: 'no-store' });
      if (r.ok) last = Date.parse((await r.json()).at) || 0;
    }
    if (Date.now() - last < MIN_GAP_MS) return 'skipped, one was requested recently';

    await put(MARKER, JSON.stringify({ at: new Date().toISOString() }), {
      access: 'public', contentType: 'application/json',
      addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0,
    });
    await fetch(hook, { method: 'POST' });
    return 'rebuild requested';
  } catch (e) {
    return 'rebuild could not be requested: ' + e.message;
  }
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return null;
  return JSON.parse(await r.text());
}

async function findLive() {
  const { blobs } = await list({ prefix: KEY, limit: 1 });
  return blobs.find((b) => b.pathname === KEY) || null;
}

const newestFirst = (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt);

async function listPrefix(prefix) {
  const { blobs } = await list({ prefix, limit: 1000 });
  return blobs.filter((b) => b.pathname.startsWith(prefix)).sort(newestFirst);
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function archiveLive() {
  const live = await findLive();
  if (!live) return null;
  const saved = await copy(live.url, `${HISTORY}content-${stamp()}.json`, {
    access: 'public', contentType: 'application/json', addRandomSuffix: true,
  });
  const all = await listPrefix(HISTORY);
  const extra = all.slice(HISTORY_KEEP);
  if (extra.length) await del(extra.map((b) => b.url));
  return saved.pathname;
}

function readBody(req) {
  const content = req.body && req.body.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return { error: [400, 'Content must be an object.'] };
  }
  const doc = migrate(content);
  const body = JSON.stringify(doc);
  if (body.length > MAX_BYTES) return { error: [413, 'Content is too large to save.'] };
  return { doc, body };
}

export default async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Blob storage is not connected to this project yet.' });
  }
  const q = req.query || {};

  if (req.method === 'GET') {
    const ownerOnly = q.draft || q.history || q.version;
    if (ownerOnly) {
      if (!(await isAdmin(req))) return res.status(401).json({ error: 'Sign in first.' });
      res.setHeader('Cache-Control', 'no-store');
      try {
        if (q.draft) {
          const [latest] = await listPrefix(DRAFTS);
          return res.status(200).json({
            draft: latest ? await fetchJson(latest.url) : null,
            savedAt: latest ? new Date(latest.uploadedAt).toISOString() : null,
          });
        }
        if (q.history) {
          const versions = (await listPrefix(HISTORY)).map((b) => ({
            id: b.pathname, savedAt: new Date(b.uploadedAt).toISOString(), size: b.size,
          }));
          return res.status(200).json({ versions });
        }
        const id = String(q.version);
        if (!id.startsWith(HISTORY) || id.includes('..')) {
          return res.status(400).json({ error: 'Unknown version.' });
        }
        const hit = (await listPrefix(HISTORY)).find((b) => b.pathname === id);
        if (!hit) return res.status(404).json({ error: 'That version no longer exists.' });
        return res.status(200).json({ content: await fetchJson(hit.url) });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    try {
      const live = await findLive();
      const content = live ? await fetchJson(live.url) : null;
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
      return res.status(200).json({ content });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    if (!(await isAdmin(req))) return res.status(401).json({ error: 'Sign in first.' });
    res.setHeader('Cache-Control', 'no-store');

    if (rateLimited('save:' + clientIp(req), 60, 60 * 1000)) {
      return res.status(429).json({ error: 'Saving too fast. Give it a moment.' });
    }

    const { doc, body, error } = readBody(req);
    if (error) return res.status(error[0]).json({ error: error[1] });

    const stage = req.body.stage === 'draft' ? 'draft' : 'publish';

    try {
      if (stage === 'draft') {
        const saved = await put(`${DRAFTS}content-draft.json`, body, {
          access: 'public', contentType: 'application/json', addRandomSuffix: true, cacheControlMaxAge: 0,
        });
        const older = (await listPrefix(DRAFTS)).filter((b) => b.pathname !== saved.pathname);
        if (older.length) await del(older.map((b) => b.url));
        return res.status(200).json({ ok: true, stage, savedAt: new Date().toISOString() });
      }

      const problems = validate(doc);
      if (problems.length) {
        return res.status(400).json({ error: 'The content has problems to fix before it can be published.', problems: problems.slice(0, 50) });
      }
      if (isPreview() && process.env.ALLOW_PREVIEW_PUBLISH !== '1') {
        return res.status(403).json({
          error: 'This is a preview deployment, which shares storage with the live site. Save a draft here and publish from the production site.',
        });
      }

      const archived = await archiveLive();
      await put(KEY, body, {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 30,
      });
      const rebuild = await requestRebuild();
      return res.status(200).json({ ok: true, stage, archived, savedAt: new Date().toISOString(), rebuild });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Use GET or POST.' });
}
