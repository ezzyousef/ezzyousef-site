import { put } from '@vercel/blob';
import sharp from 'sharp';
import { isAdmin, rateLimited, clientIp } from './_lib/auth.js';

// Vercel's Node runtime caps a request body at about 4.5 MB, so the 4 MB
// image limit below stays safely under it.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;  // refuse decompression bombs before resizing

/**
 * The real format, read from the first bytes. The browser's claimed type is
 * ignored: a renamed HTML file must not be stored and served as an image.
 * SVG is refused outright, because an SVG opened directly can run script.
 */
export function sniff(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6))) return 'gif';
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  if (!(await isAdmin(req))) return res.status(401).json({ error: 'Sign in first.' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Blob storage is not connected to this project yet.' });
  }
  if (rateLimited('upload:' + clientIp(req), 30, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many uploads in a short time. Wait a few minutes.' });
  }

  const { name, data } = req.body || {};
  if (typeof data !== 'string' || !data) {
    return res.status(400).json({ error: 'No image data received.' });
  }
  // base64 is 4 characters per 3 bytes; check before decoding a huge string.
  if (data.length > Math.ceil(MAX_BYTES / 3) * 4 + 8) {
    return res.status(413).json({ error: 'That image is over 4 MB. Resize it and try again.' });
  }

  let buf = Buffer.from(data, 'base64');
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({ error: 'That image is over 4 MB. Resize it and try again.' });
  }

  const kind = sniff(buf);
  if (!kind) {
    return res.status(400).json({ error: 'Upload a PNG, JPEG, WebP or GIF image. SVG is not accepted.' });
  }

  // Photographs off a phone are far larger than any slot on the page. Resize
  // and convert to WebP on the way in, so an upload costs the visitor what it
  // is worth rather than what the camera produced. Animated GIFs are kept.
  let ext = kind === 'jpeg' ? 'jpg' : kind;
  let outType = `image/${kind}`;
  const before = buf.length;
  try {
    const meta = await sharp(buf, { limitInputPixels: MAX_PIXELS }).metadata();
    const animated = (meta.pages || 1) > 1;
    if (!animated) {
      buf = await sharp(buf, { limitInputPixels: MAX_PIXELS })
        .rotate()                               // honour the camera orientation
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      ext = 'webp';
      outType = 'image/webp';
    }
  } catch {
    // The header looked right but the image does not decode: refuse it
    // rather than store bytes nothing can display.
    return res.status(400).json({ error: 'That image could not be read. Try exporting it again.' });
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
