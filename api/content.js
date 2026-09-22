import { list, put } from '@vercel/blob';
import { isAdmin, rateLimited } from './_lib/auth.js';

const KEY = 'content.json';
const MARKER = 'deploy-marker.json';
const MIN_GAP_MS = 3 * 60 * 1000;

/**
 * A save changes the content in storage, but the build still carries a copy
 * baked in at deploy time. Asking for a rebuild here keeps that copy current,
 * so a first-time visitor never sees the previous version for a moment.
 *
 * Fire and forget: a failure here must never fail the save. Rebuilds are
 * spaced out so a burst of edits cannot start a queue of builds.
 */
async function requestRebuild() {
  const hook = process.env.DEPLOY_HOOK_URL;
  if (!hook) return 'no hook configured';
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

async function readContent() {
  const { blobs } = await list({ prefix: KEY, limit: 1 });
  const hit = blobs.find((b) => b.pathname === KEY);
  if (!hit) return null;
  const r = await fetch(hit.url, { cache: 'no-store' });
  if (!r.ok) return null;
  return r.json();
}

export default async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Blob storage is not connected to this project yet.' });
  }

  if (req.method === 'GET') {
    try {
      const content = await readContent();
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
      return res.status(200).json({ content });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    if (!(await isAdmin(req))) return res.status(401).json({ error: 'Sign in first.' });

    const ip = req.headers['x-forwarded-for'] || 'unknown';
    if (rateLimited('save:' + ip, 60, 60 * 1000)) {
      return res.status(429).json({ error: 'Saving too fast. Give it a moment.' });
    }

    const content = req.body && req.body.content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ error: 'Content must be an object.' });
    }

    const body = JSON.stringify(content);
    if (body.length > 2_000_000) {
      return res.status(413).json({ error: 'Content is too large to save.' });
    }

    try {
      await put(KEY, body, {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 30,
      });
      const rebuild = await requestRebuild();
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString(), rebuild });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Use GET or POST.' });
}
