async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error((body && body.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.problems = (body && body.problems) || null;
    throw err;
  }
  return body;
}

const owner = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const api = {
  getContent: () => request('/api/content'),
  login: (password) => request('/api/auth', { method: 'POST', body: JSON.stringify({ password }) }),
  renew: (token) => request('/api/auth', { method: 'POST', ...owner(token), body: JSON.stringify({ renew: true }) }),
  /** stage: 'publish' (validate, archive the live copy, go live) or 'draft'. */
  saveContent: (token, content, stage = 'publish') =>
    request('/api/content', { method: 'POST', ...owner(token), body: JSON.stringify({ content, stage }) }),
  getDraft: (token) => request('/api/content?draft=1', owner(token)),
  getHistory: (token) => request('/api/content?history=1', owner(token)),
  getVersion: (token, id) => request(`/api/content?version=${encodeURIComponent(id)}`, owner(token)),
  upload: (token, file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.onload = () => {
        const data = String(reader.result).split(',')[1];
        request('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: file.name, type: file.type, data }),
        }).then(resolve, reject);
      };
      reader.readAsDataURL(file);
    }),
};
