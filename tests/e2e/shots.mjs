// Screenshots at 1440 and 390 for docs/design. Usage: node tests/e2e/shots.mjs before|after
// Starts its own short-lived vite preview of dist/ on 127.0.0.1 and stops it; external hosts are blocked.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 4185;
const BASE = `http://127.0.0.1:${PORT}`;
const label = process.argv[2] || 'after';
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const proc = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'pipe' });
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch { /* wait */ } await new Promise((r) => setTimeout(r, 150)); }
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  for (const [name, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (/^(data|blob):/.test(r.request().url()) ? r.continue() : new URL(r.request().url()).hostname === '127.0.0.1' ? (r.request().url().includes('/api/') ? r.fulfill({ status: 404, body: '{}' }) : r.continue()) : r.abort()));
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ROOT, 'docs', 'design', `${label}-${name}-top.jpg`), type: 'jpeg', quality: 70 });
    await page.screenshot({ path: path.join(ROOT, 'docs', 'design', `${label}-${name}-full.jpg`), type: 'jpeg', quality: 60, fullPage: true });
    await ctx.close();
  }
  await browser.close();
} finally { proc.kill(); }
