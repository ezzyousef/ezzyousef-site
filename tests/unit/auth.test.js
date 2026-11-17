import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { SignJWT, decodeJwt } from 'jose';
import { mockReq, mockRes, SECRET } from './helpers.js';

const HASH = bcrypt.hashSync('correct horse battery', 4);

async function fresh() {
  vi.resetModules();
  process.env.JWT_SECRET = SECRET;
  process.env.ADMIN_PASSWORD_HASH = HASH;
  const auth = (await import('../../api/auth.js')).default;
  const lib = await import('../../api/_lib/auth.js');
  return { auth, lib };
}

const login = (auth, password, ip = '203.0.113.5') => {
  const res = mockRes();
  return auth(mockReq({ method: 'POST', headers: { 'x-forwarded-for': ip }, body: { password } }), res).then(() => res);
};

describe('login', () => {
  beforeEach(() => { delete process.env.VERCEL_ENV; });

  it('issues a token for the right password and refuses a wrong one', async () => {
    const { auth } = await fresh();
    expect((await login(auth, 'nope')).statusCode).toBe(401);
    const ok = await login(auth, 'correct horse battery');
    expect(ok.statusCode).toBe(200);
    expect(typeof ok.body.token).toBe('string');
  });

  it('issues short-lived tokens (2 hours at most) with an audience', async () => {
    const { auth } = await fresh();
    const { token } = (await login(auth, 'correct horse battery')).body;
    const claims = decodeJwt(token);
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(2 * 3600);
    expect(claims.aud).toBe('ezzyousef-dashboard');
  });

  it('counts attempts per client even when the proxy chain behind it varies', async () => {
    const { auth } = await fresh();
    let last;
    for (let i = 0; i < 9; i++) last = await login(auth, 'nope', `198.51.100.7, 10.0.0.${i}`);
    expect(last.statusCode).toBe(429);
  });

  it('renews a valid token without the password, and refuses to renew a bad one', async () => {
    const { auth } = await fresh();
    const { token } = (await login(auth, 'correct horse battery')).body;
    const res = mockRes();
    await auth(mockReq({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body: { renew: true } }), res);
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe('string');

    const bad = mockRes();
    await auth(mockReq({ method: 'POST', headers: { authorization: 'Bearer nonsense' }, body: { renew: true } }), bad);
    expect(bad.statusCode).toBe(401);
  });
});

describe('isAdmin', () => {
  it('refuses tokens without the audience, from another issuer, or expired', async () => {
    const { lib } = await fresh();
    const key = new TextEncoder().encode(SECRET);
    const noAud = await new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt().setIssuer('ezzyousef-portfolio').setExpirationTime('1h').sign(key);
    const expired = await new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200).setIssuer('ezzyousef-portfolio')
      .setAudience('ezzyousef-dashboard').setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(key);
    const req = (t) => mockReq({ headers: { authorization: `Bearer ${t}` } });
    expect(await lib.isAdmin(req(noAud))).toBe(false);
    expect(await lib.isAdmin(req(expired))).toBe(false);
    expect(await lib.isAdmin(req(await lib.signToken()))).toBe(true);
  });

  it('refuses an alg=none token', async () => {
    const { lib } = await fresh();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none' })}.${b64({ role: 'admin', iss: 'ezzyousef-portfolio', aud: 'ezzyousef-dashboard', exp: 9e9 })}.`;
    expect(await lib.isAdmin(mockReq({ headers: { authorization: `Bearer ${none}` } }))).toBe(false);
  });
});

describe('sessions', () => {
  const now = () => Math.floor(Date.now() / 1000);
  const renew = async (auth, token) => {
    const res = mockRes();
    await auth(mockReq({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body: { renew: true } }), res);
    return res;
  };

  it('keeps the original sign-in time through renewals', async () => {
    const { auth, lib } = await fresh();
    const old = await lib.signToken(now() - 3600);
    const res = await renew(auth, old);
    expect(res.statusCode).toBe(200);
    expect(decodeJwt(res.body.token).auth_time).toBe(decodeJwt(old).auth_time);
  });

  it('stops renewing after the absolute session lifetime, and rejects such tokens', async () => {
    const { auth, lib } = await fresh();
    expect(lib.SESSION_MAX_SECONDS).toBe(12 * 3600);
    const tooOld = await lib.signToken(now() - 13 * 3600);
    expect((await renew(auth, tooOld)).statusCode).toBe(401);
    expect(await lib.isAdmin(mockReq({ headers: { authorization: `Bearer ${tooOld}` } }))).toBe(false);
  });

  it('never lets a token outlive the absolute deadline', async () => {
    const { lib } = await fresh();
    const t = decodeJwt(await lib.signToken(now() - 11.5 * 3600));
    expect(t.exp).toBeLessThanOrEqual(t.auth_time + lib.SESSION_MAX_SECONDS);
  });

  it('ends every session when the password hash changes', async () => {
    const { lib } = await fresh();
    const token = await lib.signToken();
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    expect(await lib.isAdmin(req)).toBe(true);
    process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('a new password', 4);
    expect(await lib.isAdmin(req)).toBe(false);
  });

  it('refuses tokens that carry no session information', async () => {
    const { lib } = await fresh();
    const key = new TextEncoder().encode(SECRET);
    const legacy = await new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt().setIssuer('ezzyousef-portfolio').setAudience('ezzyousef-dashboard').setExpirationTime('1h').sign(key);
    expect(await lib.isAdmin(mockReq({ headers: { authorization: `Bearer ${legacy}` } }))).toBe(false);
  });
});
