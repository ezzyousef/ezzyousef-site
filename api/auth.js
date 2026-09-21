import bcrypt from 'bcryptjs';
import { signToken, rateLimited } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (rateLimited('auth:' + ip, 8, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Wait ten minutes and try again.' });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD_HASH is not set on the server.' });
  }

  const password = (req.body && req.body.password) || '';
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Enter your password.' });
  }

  const ok = await bcrypt.compare(password, hash);
  if (!ok) {
    return res.status(401).json({ error: 'That password is not right.' });
  }

  try {
    return res.status(200).json({ token: await signToken() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
