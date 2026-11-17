import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import seed from './content.generated.json';
import { api } from './lib/api.js';
import { loadContent } from './lib/merge.js';
import { css, fontHref } from './theme.js';
import Site from './site/Site.jsx';
import ProjectPage from './site/ProjectPage.jsx';
import { projectSlugs, slugFromPath } from './lib/slug.js';

// The dashboard is a third of the code and visitors never open it, so it is
// fetched only when someone goes to #admin.
const Admin = lazy(() => import('./admin/Admin.jsx'));

function Missing({ c }) {
  return (
    <main id="main" className="page project-page">
      <h1>This project is no longer listed</h1>
      <p><a href="/#software">See the current software</a> or go to <a href="/">{c.hero.name}</a>.</p>
    </main>
  );
}

const CACHE_KEY = 'site-content-v1';

/** The last content this browser saw. Using it as the first paint means a
 *  returning visitor never watches the page change under them. */
function cached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return loadContent(seed, raw ? JSON.parse(raw) : null);
  } catch {
    return loadContent(seed, null);
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
        setContent(loadContent(seed, r.content));
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

  const slug = slugFromPath(window.location.pathname);
  const projectIndex = slug ? projectSlugs(content.software.projects).indexOf(slug) : -1;

  useEffect(() => {
    if (slug) return;   // a project page sets its own title
    if (content.meta) {
      if (content.meta.title) document.title = content.meta.title;
      const d = document.querySelector('meta[name="description"]');
      if (d && content.meta.description) d.setAttribute('content', content.meta.description);
    }
  }, [content.meta, slug]);

  const exitAdmin = useCallback(() => {
    window.location.hash = '';
    setIsAdmin(false);
  }, []);

  return (
    <>
      {!slug && <Site c={content} />}
      {slug && projectIndex >= 0 && <ProjectPage c={content} index={projectIndex} />}
      {slug && projectIndex < 0 && <Missing c={content} />}
      {isAdmin && (
        <Suspense fallback={<div className="ad-loading" role="status">Loading the dashboard…</div>}>
          <Admin
            content={content}
            setContent={setContent}
            onExit={exitAdmin}
            loaded={loaded}
            base={seed}
          />
        </Suspense>
      )}
    </>
  );
}
