import { jwtVerify, SignJWT } from 'jose';

const ISSUER = 'ezzyousef-portfolio';

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
    .setExpirationTime('8h')
    .sign(secret());
}

/** Returns true when the request carries a valid admin token. */
export async function isAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return false;
  try {
    await jwtVerify(token, secret(), { issuer: ISSUER });
    return true;
  } catch {
    return false;
  }
}

/** Small per-instance throttle. Not bulletproof across instances, but it
 *  turns a fast brute-force attempt into a slow one. */
const hits = new Map();

export function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}
