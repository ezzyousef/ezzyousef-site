import bcrypt from 'bcryptjs';
import { signToken, adminClaims, rateLimited, clientIp, TOKEN_TTL_SECONDS } from './_lib/auth.js';

/**
 * POST { password }          -> { token, expiresIn }
 * POST { renew: true } with a valid Bearer token -> a fresh token, so a long
 * editing session never needs the password twice, while a stolen token
 * lasts at most two hours, and never past 12 hours from the real sign-in.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const ip = clientIp(req);
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  if (body.renew === true) {
    if (rateLimited('renew:' + ip, 30, 10 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many requests. Wait a few minutes.' });
    }
    const claims = await adminClaims(req);
    if (!claims) return res.status(401).json({ error: 'Sign in again.' });
    try {
      return res.status(200).json({ token: await signToken(claims.auth_time), expiresIn: TOKEN_TTL_SECONDS });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (rateLimited('auth:' + ip, 8, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Wait ten minutes and try again.' });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD_HASH is not set on the server.' });
  }

  const password = body.password || '';
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Enter your password.' });
  }
  // bcrypt only reads the first 72 bytes; refuse absurd inputs before hashing.
  if (password.length > 1024) {
    return res.status(400).json({ error: 'That password is too long.' });
  }

  const ok = await bcrypt.compare(password, hash);
  if (!ok) {
    return res.status(401).json({ error: 'That password is not right.' });
  }

  try {
    return res.status(200).json({ token: await signToken(), expiresIn: TOKEN_TTL_SECONDS });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
