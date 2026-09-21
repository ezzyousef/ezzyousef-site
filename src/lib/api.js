async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
  return body;
}

export const api = {
  getContent: () => request('/api/content'),
  login: (password) => request('/api/auth', { method: 'POST', body: JSON.stringify({ password }) }),
  saveContent: (token, content) =>
    request('/api/content', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    }),
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
