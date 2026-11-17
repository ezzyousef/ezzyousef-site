/** Minimal stand-ins for Vercel's Node request and response objects. */
export function mockReq({ method = 'GET', headers = {}, body, query = {}, url = '/' } = {}) {
  return { method, headers, body, query, url };
}

export function mockRes() {
  const res = {
    statusCode: 200, headers: {}, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    end() { return this; },
  };
  return res;
}

export const SECRET = 'x'.repeat(48);
