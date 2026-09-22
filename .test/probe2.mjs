import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const secrets = readFileSync('C:/Users/ezzyo/Desktop/Website Setup/SECRETS.txt', 'utf8');
const pw = (secrets.match(/^\s+([a-z]+-[a-z]+-[a-z]+-\d+)\s*$/m) || [])[1];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + ' | ' + (e.stack||'').split('\n')[1]));

await page.goto('https://ezzyousef-site.vercel.app/#admin', { waitUntil: 'networkidle' });
await page.fill('.ad-login input[type=password]', pw);
await page.click('.ad-btn.primary');
await page.waitForTimeout(3000);
await page.screenshot({ path: '.test/2-dashboard.png' });

const after = await page.evaluate(() => {
  const el = (s) => document.querySelector(s);
  const info = (s) => {
    const e = el(s);
    if (!e) return 'MISSING';
    const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    return `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.x)},${Math.round(r.y)} bg=${c.backgroundColor} color=${c.color} display=${c.display}`;
  };
  return {
    rootChildren: document.getElementById('root')?.children.length,
    shell: info('.ad-shell'),
    side: info('.ad-side'),
    main: info('.ad-main'),
    top: info('.ad-top'),
    body: info('.ad-body'),
    navButtons: document.querySelectorAll('.ad-nav button').length,
    fields: document.querySelectorAll('.ad-field').length,
    h1: el('.ad-top h1')?.textContent ?? null,
    bodyText: (el('.ad-body')?.innerText || '').slice(0, 120),
  };
});
console.log(JSON.stringify({ errors, after }, null, 2));
await browser.close();
