import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const secrets = readFileSync('C:/Users/ezzyo/Desktop/Website Setup/SECRETS.txt', 'utf8');
const pw = (secrets.match(/^\s+([a-z]+-[a-z]+-[a-z]+-\d+)\s*$/m) || [])[1];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto('https://ezzyousef-site.vercel.app/#admin', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: '.test/1-login.png' });

const seen = await page.evaluate(() => {
  const wrap = document.querySelector('.ad-login-wrap');
  const card = document.querySelector('.ad-login');
  const styleTags = [...document.querySelectorAll('style')].map(s => s.textContent.length);
  const info = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y),
             bg: c.backgroundColor, color: c.color, display: c.display, vis: c.visibility, op: c.opacity, z: c.zIndex };
  };
  return { rootChildren: document.getElementById('root')?.children.length,
           styleTagSizes: styleTags, wrap: info(wrap), card: info(card),
           h2: document.querySelector('.ad-login h2')?.textContent || null };
});

console.log(JSON.stringify({ password: pw ? 'found' : 'NOT FOUND', errors, seen }, null, 2));
await browser.close();
