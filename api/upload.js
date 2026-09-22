import { put } from '@vercel/blob';
import sharp from 'sharp';
import { isAdmin } from './_lib/auth.js';

// Vercel's Node runtime caps a request body at about 4.5 MB, so the 4 MB
// image limit below stays safely under it.

const ALLOWED = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  if (!(await isAdmin(req))) return res.status(401).json({ error: 'Sign in first.' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Blob storage is not connected to this project yet.' });
  }

  const { name, type, data } = req.body || {};
  if (!type || !ALLOWED[type]) {
    return res.status(400).json({ error: 'Upload a PNG, JPEG, WebP, GIF or SVG image.' });
  }
  if (typeof data !== 'string' || !data) {
    return res.status(400).json({ error: 'No image data received.' });
  }

  let buf = Buffer.from(data, 'base64');
  if (buf.length > 4 * 1024 * 1024) {
    return res.status(413).json({ error: 'That image is over 4 MB. Resize it and try again.' });
  }

  // Photographs off a phone are far larger than any slot on the page. Resize
  // and convert to WebP on the way in, so an upload costs the visitor what it
  // is worth rather than what the camera produced. SVG is left alone.
  let ext = ALLOWED[type];
  let outType = type;
  const before = buf.length;
  if (type !== 'image/svg+xml') {
    try {
      buf = await sharp(buf)
        .rotate()                               // honour the camera orientation
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      ext = 'webp';
      outType = 'image/webp';
    } catch {
      // unreadable or an unusual format: store what was sent
    }
  }

  const stem = String(name || 'image')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'image';

  try {
    const blob = await put(`media/${stem}.${ext}`, buf, {
      access: 'public',
      contentType: outType,
      addRandomSuffix: true,
    });
    return res.status(200).json({
      url: blob.url,
      pathname: blob.pathname,
      bytes: buf.length,
      savedBytes: Math.max(0, before - buf.length),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
