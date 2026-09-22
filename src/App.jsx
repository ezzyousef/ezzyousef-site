import { useCallback, useEffect, useMemo, useState } from 'react';
import seed from './content.generated.json';
import { api } from './lib/api.js';
import { css, fontHref } from './theme.js';
import Site from './site/Site.jsx';
import Admin from './admin/Admin.jsx';

/** Deep merge so a saved document that predates a new field still renders. */
function merge(base, override) {
  if (Array.isArray(override)) return override;
  if (override && typeof override === 'object' && !Array.isArray(base) && base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(override)) out[k] = merge(base[k], override[k]);
    return out;
  }
  return override === undefined ? base : override;
}

const CACHE_KEY = 'site-content-v1';

/** The last content this browser saw. Using it as the first paint means a
 *  returning visitor never watches the page change under them. */
function cached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? merge(seed, JSON.parse(raw)) : seed;
  } catch {
    return seed;
  }
}

export default function App() {
  const [content, setContent] = useState(cached);
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash === '#admin');

  useEffect(() => {
    let alive = true;
    api
      .getContent()
      .then((r) => {
        if (!alive || !r || !r.content) return;
        setContent(merge(seed, r.content));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(r.content)); } catch { /* private mode */ }
      })
      .catch(() => { /* fall back to the version shipped with the build */ })
      .finally(() => alive && setLoaded(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash === '#admin');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const theme = content.theme || seed.theme;
  const sheet = useMemo(() => css(theme), [theme]);
  const fonts = useMemo(() => fontHref(theme), [theme]);

  useEffect(() => {
    let el = document.getElementById('theme-css');
    if (!el) {
      el = document.createElement('style');
      el.id = 'theme-css';
      document.head.appendChild(el);
    }
    el.textContent = sheet;
  }, [sheet]);

  useEffect(() => {
    let link = document.getElementById('theme-fonts');
    if (!link) {
      link = document.createElement('link');
      link.id = 'theme-fonts';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== fonts) link.href = fonts;
  }, [fonts]);

  useEffect(() => {
    if (content.meta) {
      if (content.meta.title) document.title = content.meta.title;
      const d = document.querySelector('meta[name="description"]');
      if (d && content.meta.description) d.setAttribute('content', content.meta.description);
    }
  }, [content.meta]);

  const exitAdmin = useCallback(() => {
    window.location.hash = '';
    setIsAdmin(false);
  }, []);

  return (
    <>
      <Site c={content} />
      {isAdmin && (
        <Admin
          content={content}
          setContent={setContent}
          onExit={exitAdmin}
          loaded={loaded}
        />
      )}
    </>
  );
}
