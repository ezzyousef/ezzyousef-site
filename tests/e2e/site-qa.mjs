// Local site QA against the production build served by `vite preview`.
//
// Checks, per route and viewport: axe-core (WCAG 2.0/2.1/2.2 A and AA),
// horizontal overflow, broken internal links, images and in-page anchors,
// console errors, CSP violations (the Content-Security-Policy from
// vercel.json is applied to every local HTML response), keyboard reachability
// of the image viewer, and the bytes transferred.
//
// Every request that is not to the local preview server is blocked, so
// nothing leaves this PC. External links are listed but not fetched.
//
// Usage: npm run build && node tests/e2e/site-qa.mjs [--json out.json] [--shots]
// Env:   CHROME_PATH (defaults to the usual Chrome / Edge install paths)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.QA_PORT || 4183);
const BASE = `http://127.0.0.1:${PORT}`;
const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 780 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1366', width: 1366, height: 900 },
  { name: 'mobile-dark', width: 360, height: 780, colorScheme: 'dark' },
];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const shots = args.includes('--shots');

function routes() {
  const list = ['/'];
  const sm = path.join(ROOT, 'dist', 'sitemap.xml');
  if (existsSync(sm)) {
    for (const m of readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = new URL(m[1]).pathname;
      if (!list.includes(p)) list.push(p);
    }
  }
  return list;
}

function cspFromVercel() {
  const cfg = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  for (const h of cfg.headers || []) {
    for (const kv of h.headers) if (kv.key.toLowerCase() === 'content-security-policy') return kv.value;
  }
  return null;
}

function findChrome() {
  const hit = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean).find((p) => existsSync(p));
  if (!hit) throw new Error('No Chrome or Edge found; set CHROME_PATH');
  return hit;
}

async function startPreview() {
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) throw new Error('dist/ is missing; run npm run build first');
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const proc = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: ROOT, stdio: 'pipe' });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${BASE}/`); if (r.ok) return proc; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  proc.kill();
  throw new Error('vite preview did not start');
}

async function axeRun(page, axeSource) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0] && v.nodes[0].target.join(' ') }));
  }, AXE_TAGS);
}

async function main() {
  const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const csp = cspFromVercel();
  const preview = await startPreview();
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  const results = [];
  const external = new Set();
  const ROUTES = routes();
  try {
    for (const vp of VIEWPORTS) {
      for (const route of ROUTES) {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce', colorScheme: vp.colorScheme || 'light' });
        const page = await ctx.newPage();
        const consoleErrors = [];
        const failed = [];
        let bytes = 0;
        // "Failed to load resource" is the blocked external request or the
        // absent local API; real local failures are counted in `failed`.
        page.on('console', (m) => {
          if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) consoleErrors.push(m.text().slice(0, 240));
        });
        page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 240)));
        await page.route('**/*', async (r) => {
          const u = new URL(r.request().url());
          if (u.protocol === 'data:' || u.protocol === 'blob:') return r.continue();
          if (u.hostname !== '127.0.0.1') { external.add(u.hostname); return r.abort(); }
          // The API runs only on Vercel. Locally it is simply absent, which
          // the app must survive by rendering the content baked into the build.
          if (u.pathname.startsWith('/api/')) {
            return r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no api locally"}' });
          }
          const resp = await r.fetch();
          const headers = { ...resp.headers() };
          if (csp && (headers['content-type'] || '').includes('text/html')) headers['content-security-policy'] = csp;
          const body = await resp.body();
          bytes += body.length;
          if (resp.status() >= 400) failed.push(`${resp.status()} ${u.pathname}`);
          return r.fulfill({ status: resp.status(), headers, body });
        });
        const resp = await page.goto(BASE + route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(150);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

        const refs = await page.evaluate(() => ({
          links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
          imgs: [...document.querySelectorAll('img')].map((i) => i.getAttribute('src')),
          ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
          unsafe: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
            .filter((h) => /^\s*(javascript|data|vbscript):/i.test(h)),
          blankNoOpener: [...document.querySelectorAll('a[target=_blank]')].filter((a) => !/noopener/.test(a.rel)).length,
          title: document.title,
        }));
        const brokenLinks = [];
        for (const href of new Set(refs.links)) {
          if (href.startsWith('#')) {
            const id = href.slice(1);
            if (id && id !== 'admin' && !refs.ids.includes(id)) brokenLinks.push(href);
            continue;
          }
          let u;
          try { u = new URL(href, BASE + route); } catch { brokenLinks.push(href); continue; }
          if (u.protocol === 'mailto:' || u.protocol === 'tel:') continue;
          if (u.origin !== BASE) { external.add(u.hostname); continue; }
          const r = await fetch(u.origin + u.pathname);
          const text = r.ok ? await r.text() : '';
          if (!r.ok || /data-page="404"/.test(text)) brokenLinks.push(href);
          if (u.hash && u.pathname === new URL(BASE + route).pathname) {
            const id = decodeURIComponent(u.hash.slice(1));
            if (id && !refs.ids.includes(id)) brokenLinks.push(href);
          }
        }
        for (const src of new Set(refs.imgs.filter(Boolean))) {
          const u = new URL(src, BASE);
          if (u.origin !== BASE) continue;
          const r = await fetch(u.href);
          if (!r.ok || !(r.headers.get('content-type') || '').startsWith('image/')) brokenLinks.push('img ' + u.pathname);
        }

        // Keyboard: every image that opens the viewer must sit in a button or link.
        const zoomNotFocusable = await page.evaluate(() =>
          [...document.querySelectorAll('img.shot, .figrow img')].filter((img) => !img.closest('button, a')).length);

        const axe = await axeRun(page, axeSource);

        if (shots && vp.name !== 'tablet-768' && (route === '/' || route === ROUTES[1])) {
          const dir = path.join(ROOT, 'docs', 'upgrade', 'screenshots');
          mkdirSync(dir, { recursive: true });
          const name = `${vp.name}${route === '/' ? '-home' : route.replace(/\/$/, '').replace(/\//g, '-')}.jpg`;
          await page.screenshot({ path: path.join(dir, name), type: 'jpeg', quality: 55 });
        }

        results.push({
          viewport: vp.name, route, status: resp.status(), title: refs.title, overflow, axe, consoleErrors, failed,
          brokenLinks, unsafe: refs.unsafe, blankNoOpener: refs.blankNoOpener, zoomNotFocusable, kb: Math.round(bytes / 1024),
        });
        await ctx.close();
      }
    }

    // The not-found page: present, accessible, links home, fits at 360 px.
    {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
      const page = await ctx.newPage();
      await page.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
      const exists = existsSync(path.join(ROOT, 'dist', '404.html'));
      let notFound = { exists, ok: false };
      if (exists) {
        await page.goto(`${BASE}/404.html`, { waitUntil: 'networkidle' });
        const axe = (await axeRun(page, axeSource)).map((v) => v.id);
        const home = await page.locator('a[href="/"]').count();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        notFound = { exists, ok: axe.length === 0 && home > 0 && overflow <= 0, axe, home, overflow };
      }
      results.push({ viewport: 'mobile-360', route: '/404.html', notFound });
      await ctx.close();
    }
  } finally {
    await browser.close();
    preview.kill();
  }

  let problems = 0;
  for (const r of results) {
    if (r.notFound) {
      const bad = !r.notFound.ok;
      problems += bad ? 1 : 0;
      console.log(`${bad ? 'FAIL' : 'ok  '} 404 page ${JSON.stringify(r.notFound)}`);
      continue;
    }
    const issues = [];
    if (r.status !== 200) issues.push(`status ${r.status}`);
    if (r.overflow > 0) issues.push(`horizontal overflow ${r.overflow}px`);
    if (r.axe.length) issues.push('axe: ' + r.axe.map((v) => `${v.id}(${v.impact},${v.nodes}) ${v.sample}`).join('; '));
    if (r.consoleErrors.length) issues.push('console: ' + r.consoleErrors.join(' | '));
    if (r.failed.length) issues.push('failed requests: ' + r.failed.join(', '));
    if (r.brokenLinks.length) issues.push('broken: ' + r.brokenLinks.join(', '));
    if (r.unsafe.length) issues.push('unsafe hrefs: ' + r.unsafe.join(', '));
    if (r.blankNoOpener) issues.push(`${r.blankNoOpener} target=_blank links without noopener`);
    if (r.zoomNotFocusable) issues.push(`${r.zoomNotFocusable} zoomable images not reachable by keyboard`);
    problems += issues.length;
    console.log(`${issues.length ? 'FAIL' : 'ok  '} ${r.viewport.padEnd(13)} ${r.route.padEnd(34)} ${String(r.kb).padStart(5)} KB` +
      (issues.length ? '\n     ' + issues.join('\n     ') : ''));
  }
  console.log(`\nExternal hosts linked or requested (blocked, not checked): ${[...external].sort().join(', ')}`);
  console.log(`${results.length} page checks, ${problems} problem(s)`);
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ results, external: [...external] }, null, 2));
  process.exit(problems ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
