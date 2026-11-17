import { describe, it, expect, beforeEach, vi } from 'vitest';
import sharp from 'sharp';
import { mockReq, mockRes, SECRET } from './helpers.js';

const put = vi.fn(async (pathname, body, opts) => ({ url: `https://blob.example/${pathname}`, pathname, opts }));
vi.mock('@vercel/blob', () => ({ put: (...a) => put(...a) }));

async function setup() {
  vi.resetModules();
  process.env.JWT_SECRET = SECRET;
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token-not-real';
  const upload = (await import('../../api/upload.js')).default;
  const { signToken } = await import('../../api/_lib/auth.js');
  return { upload, token: await signToken() };
}

async function send(upload, token, body, ip = '192.0.2.10') {
  const res = mockRes();
  await upload(mockReq({ method: 'POST', headers: { authorization: `Bearer ${token}`, 'x-forwarded-for': ip }, body }), res);
  return res;
}

const png = async () => (await sharp({ create: { width: 40, height: 30, channels: 3, background: '#336699' } }).png().toBuffer()).toString('base64');

describe('upload', () => {
  beforeEach(() => put.mockClear());

  it('requires a signed-in owner', async () => {
    const { upload } = await setup();
    const res = await send(upload, 'bad', { name: 'a.png', type: 'image/png', data: await png() });
    expect(res.statusCode).toBe(401);
    expect(put).not.toHaveBeenCalled();
  });

  it('stores a real PNG as WebP', async () => {
    const { upload, token } = await setup();
    const res = await send(upload, token, { name: 'My Photo.PNG', type: 'image/png', data: await png() });
    expect(res.statusCode).toBe(200);
    expect(put).toHaveBeenCalledOnce();
    const [pathname, , opts] = put.mock.calls[0];
    expect(pathname).toMatch(/^media\/my-photo\.webp$/);
    expect(opts.contentType).toBe('image/webp');
    expect(opts.addRandomSuffix).toBe(true);
  });

  it('refuses SVG, which can carry script', async () => {
    const { upload, token } = await setup();
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>').toString('base64');
    const res = await send(upload, token, { name: 'x.svg', type: 'image/svg+xml', data: svg });
    expect(res.statusCode).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('judges the file by its bytes, not by the type the browser claimed', async () => {
    const { upload, token } = await setup();
    const html = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
    const res = await send(upload, token, { name: 'x.png', type: 'image/png', data: html });
    expect(res.statusCode).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('refuses files over 4 MB', async () => {
    const { upload, token } = await setup();
    const big = Buffer.alloc(4 * 1024 * 1024 + 10, 0).toString('base64');
    const res = await send(upload, token, { name: 'x.png', type: 'image/png', data: big });
    expect(res.statusCode).toBe(413);
  });

  it('rate limits uploads', async () => {
    const { upload, token } = await setup();
    const data = await png();
    let last;
    for (let i = 0; i < 31; i++) last = await send(upload, token, { name: 'a.png', type: 'image/png', data }, '192.0.2.99');
    expect(last.statusCode).toBe(429);
  });
});
