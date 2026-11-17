import { list, put, del } from '@vercel/blob';
import { isAdmin, rateLimited, clientIp } from './_lib/auth.js';
import { migrate, validate } from '../src/lib/content-schema.js';

/**
 * The content document.
 *
 *   GET                      public: the published content
 *   GET ?draft=1             owner:  the latest saved draft, if any
 *   GET ?history=1           owner:  published revisions, newest first
 *   GET ?version=<id>        owner:  one published revision
 *   POST { content, baseRevision }             owner: validate, then publish
 *   POST { content, stage: 'draft' }           owner: save a draft; the live site is untouched
 *   POST { rebuild: true }                     owner: retry a rebuild that was queued
 *
 * Storage layout in Vercel Blob. Everything except the two pointers is
 * written once and never overwritten, so a concurrent request can never
 * destroy another request's work:
 *   content.json                     the live document (fixed name; carries its `revision`)
 *   history/content-*.json           every published revision (random suffix), newest 30 kept
 *   drafts/<scope>/draft-*.json      every saved draft (random suffix), newest 10 kept
 *   drafts/<scope>/latest.json       pointer to the newest draft
 *   deploy-marker.json               when a rebuild was last requested, and whether one is waiting
 *
 * <scope> is "live" in production and "preview" on preview deployments, which
 * share the production Blob store: a preview can save drafts, but they are
 * kept apart, and publishing is refused there unless ALLOW_PREVIEW_PUBLISH=1.
 *
 * Publishing is optimistic: the editor sends the revision it started from and
 * a mismatch is refused with 409. Blob has no atomic compare-and-swap, so two
 * requests that pass the check at the same instant can both publish; the
 * later write wins on the live site, but both are kept in history.
 */

const KEY = 'content.json';
const DRAFTS = 'drafts/';
const HISTORY = 'history/';
const HISTORY_KEEP = 30;
const DRAFTS_KEEP = 10;
const MARKER = 'deploy-marker.json';
const MIN_GAP_MS = 3 * 60 * 1000;
const MAX_BYTES = 2_000_000;

const isProduction = () => process.env.VERCEL_ENV === 'production';
const isPreview = () => !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production';
const draftScope = () => `${DRAFTS}${isPreview() ? 'preview' : 'live'}/`;

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return null;
  return JSON.parse(await r.text());
}

async function readMarker() {
  const { blobs } = await list({ prefix: MARKER, limit: 1 });
  const hit = blobs.find((b) => b.pathname === MARKER);
  if (!hit) return { at: 0, pending: false };
  const m = await fetchJson(hit.url);
  return { at: Date.parse(m && m.at) || 0, pending: !!(m && m.pending) };
}

const writeMarker = (at, pending) => put(MARKER, JSON.stringify({ at: new Date(at).toISOString(), pending }), {
  access: 'public', contentType: 'application/json',
  addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0,
});

/**
 * A save changes the content in storage, but the build still carries a copy
 * baked in at deploy time, so a rebuild keeps the static pages current. Only
 * production asks: a preview must never rebuild the live site.
 *
 * Never throws and never fails the save. Returns a structured status:
 *   requested | pending (too soon after the last one; retry after N seconds)
 *   failed | not-configured | not-requested | none-needed
 * A "pending" rebuild is remembered in the marker, so the trailing rebuild is
 * eventually run by a retry (the dashboard does this) and the latest content
 * is not left out.
 */
async function requestRebuild({ onlyIfPending = false } = {}) {
  const hook = process.env.DEPLOY_HOOK_URL;
  if (!hook) return { status: 'not-configured', message: 'No rebuild hook is configured.' };
  if (!isProduction()) return { status: 'not-requested', message: 'Not production; no rebuild requested.' };
  try {
    const marker = await readMarker();
    if (onlyIfPending && !marker.pending) return { status: 'none-needed', message: 'No rebuild is waiting.' };
    const wait = marker.at + MIN_GAP_MS - Date.now();
    if (wait > 0) {
      await writeMarker(marker.at, true);
      return { status: 'pending', message: 'A rebuild was requested a moment ago; another will follow.', retryAfter: Math.ceil(wait / 1000) };
    }
    await writeMarker(Date.now(), false);
    const r = await fetch(hook, { method: 'POST' });
    if (!r.ok) {
      await writeMarker(marker.at, true);
      return { status: 'failed', message: `The rebuild request was refused (${r.status}).` };
    }
    return { status: 'requested', message: 'A rebuild was requested.' };
  } catch (e) {
    return { status: 'failed', message: 'The rebuild could not be requested: ' + e.message };
  }
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
const jsonOpts = { access: 'public', contentType: 'application/json', addRandomSuffix: true, cacheControlMaxAge: 0 };

/** Keeps the newest `keep` objects under a prefix; only ever removes older ones. */
async function trim(prefix, keep, skip = () => false) {
  const extra = (await listPrefix(prefix)).filter((b) => !skip(b)).slice(keep);
  if (extra.length) await del(extra.map((b) => b.url));
}

async function readDraft() {
  const scope = draftScope();
  const pointer = (await listPrefix(`${scope}latest.json`)).find((b) => b.pathname === `${scope}latest.json`);
  let target = null;
  if (pointer) {
    const p = await fetchJson(pointer.url);
    if (p && p.url) target = { url: p.url, uploadedAt: p.savedAt };
  }
  if (!target) {
    const [newest] = (await listPrefix(`${scope}draft-`));
    if (newest) target = newest;
  }
  if (!target) return { draft: null, savedAt: null };
  return { draft: await fetchJson(target.url), savedAt: new Date(target.uploadedAt).toISOString() };
}

async function saveDraft(body) {
  const scope = draftScope();
  const saved = await put(`${scope}draft-${stamp()}.json`, body, jsonOpts);
  const savedAt = new Date().toISOString();
  await put(`${scope}latest.json`, JSON.stringify({ path: saved.pathname, url: saved.url, savedAt }), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0,
  });
  await trim(`${scope}draft-`, DRAFTS_KEEP);
  return savedAt;
}

function readBody(req) {
  const content = req.body && req.body.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return { error: [400, 'Content must be an object.'] };
  }
  return { doc: migrate(content) };
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
        if (q.draft) return res.status(200).json(await readDraft());
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

    if (req.body && req.body.rebuild === true) {
      return res.status(200).json({ ok: true, rebuild: await requestRebuild({ onlyIfPending: true }) });
    }

    const { doc, error } = readBody(req);
    if (error) return res.status(error[0]).json({ error: error[1] });

    const problems = validate(doc);
    if (problems.length) {
      return res.status(400).json({ error: 'The content has problems to fix before it can be saved.', problems: problems.slice(0, 50) });
    }

    const stage = req.body.stage === 'draft' ? 'draft' : 'publish';

    try {
      if (stage === 'draft') {
        const body = JSON.stringify(doc);
        if (body.length > MAX_BYTES) return res.status(413).json({ error: 'Content is too large to save.' });
        return res.status(200).json({ ok: true, stage, savedAt: await saveDraft(body) });
      }

      if (isPreview() && process.env.ALLOW_PREVIEW_PUBLISH !== '1') {
        return res.status(403).json({
          error: 'This is a preview deployment, which shares storage with the live site. Save a draft here and publish from the production site.',
        });
      }
      const base = req.body.baseRevision;
      if (!Number.isInteger(base) || base < 0) {
        return res.status(400).json({ error: 'Reload the dashboard: it did not say which version this edit started from.' });
      }

      const live = await findLive();
      const current = live ? await fetchJson(live.url) : null;
      const currentRevision = (current && Number.isInteger(current.revision) && current.revision) || 0;
      if (base !== currentRevision) {
        return res.status(409).json({
          error: 'The live site changed since you opened it (another tab or session published). Load the latest, re-apply your edits, then publish.',
          currentRevision,
        });
      }

      const revision = currentRevision + 1;
      doc.revision = revision;
      const body = JSON.stringify(doc);
      if (body.length > MAX_BYTES) return res.status(413).json({ error: 'Content is too large to save.' });

      // A document published before revisions existed has no history entry yet.
      if (current && current.revision === undefined) {
        await put(`${HISTORY}content-${stamp()}-legacy.json`, JSON.stringify(current), jsonOpts);
      }
      const archived = (await put(`${HISTORY}content-${stamp()}-r${revision}.json`, body, jsonOpts)).pathname;
      await put(KEY, body, {
        access: 'public', contentType: 'application/json',
        addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 30,
      });
      await trim(HISTORY, HISTORY_KEEP);
      const rebuild = await requestRebuild();
      return res.status(200).json({ ok: true, stage, revision, archived, savedAt: new Date().toISOString(), rebuild });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Use GET or POST.' });
}
