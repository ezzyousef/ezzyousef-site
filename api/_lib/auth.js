import { createHash } from 'node:crypto';
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

/** Renewals keep the original sign-in time; past this the password is needed again. */
export const SESSION_MAX_SECONDS = 12 * 60 * 60;

/** Tied to the password hash, so changing the password ends every session. */
function sessionVersion() {
  return createHash('sha256').update('sv:' + (process.env.ADMIN_PASSWORD_HASH || '')).digest('hex').slice(0, 16);
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** authTime: when the password was last entered (seconds). Defaults to now. */
export async function signToken(authTime = nowSeconds()) {
  const exp = Math.min(nowSeconds() + TOKEN_TTL_SECONDS, authTime + SESSION_MAX_SECONDS);
  return new SignJWT({ role: 'admin', auth_time: authTime, sv: sessionVersion() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(exp)
    .sign(secret());
}

/** The verified claims, or null when the request carries no valid admin token. */
export async function adminClaims(req) {
  const header = (req.headers && req.headers.authorization) || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'],
    });
    if (payload.role !== 'admin') return null;
    if (payload.sv !== sessionVersion()) return null;
    if (typeof payload.auth_time !== 'number' || nowSeconds() - payload.auth_time > SESSION_MAX_SECONDS) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Returns true when the request carries a valid admin token. */
export async function isAdmin(req) {
  return !!(await adminClaims(req));
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
