import { jwtVerify, SignJWT } from 'jose';

const ISSUER = 'ezzyousef-portfolio';
const AUDIENCE = 'ezzyousef-dashboard';
// Short enough that a leaked token is soon useless; the dashboard renews it
// while the owner is working, so a long session still never asks twice.
export const TOKEN_TTL_SECONDS = 2 * 60 * 60;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET is missing or too short. Set it in the Vercel project settings.');
  }
  return new TextEncoder().encode(s);
}

export async function signToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

/** Returns true when the request carries a valid admin token. */
export async function isAdmin(req) {
  const header = (req.headers && req.headers.authorization) || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'],
    });
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * The visitor's address. Vercel puts the real client first in
 * x-forwarded-for (and in x-real-ip); anything after the first comma is the
 * proxy chain, which must not create a fresh rate-limit bucket per request.
 */
export function clientIp(req) {
  const h = req.headers || {};
  const first = String(h['x-forwarded-for'] || '').split(',')[0].trim();
  return first || String(h['x-real-ip'] || '').trim() || 'unknown';
}

/** Small per-instance throttle. Not bulletproof across instances, but it
 *  turns a fast brute-force attempt into a slow one. */
const hits = new Map();

export function rateLimited(key, max, windowMs) {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, rec] of hits) if (now > rec.reset) hits.delete(k);
  }
  const rec = hits.get(key);
  if (!rec || now > rec.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}
