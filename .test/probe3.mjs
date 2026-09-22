import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';
const secrets = readFileSync('C:/Users/ezzyo/Desktop/Website Setup/SECRETS.txt', 'utf8');
const pw = (secrets.match(/^\s+([a-z]+-[a-z]+-[a-z]+-\d+)\s*$/m) || [])[1];

const browser = await chromium.launch();
for (const [name, opts] of [
  ['phone', { ...devices['iPhone 13'] }],
  ['tablet', { viewport: { width: 820, height: 1180 }, isMobile: false }],
]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('https://ezzyousef-site.vercel.app/#admin', { waitUntil: 'networkidle' });
  await page.fill('.ad-login input[type=password]', pw);
  await page.click('.ad-btn.primary');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `.test/3-${name}.png` });
  const r = await page.evaluate(() => {
    const info = (s) => { const e = document.querySelector(s); if (!e) return 'MISSING';
      const b = e.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)} at ${Math.round(b.x)},${Math.round(b.y)}`; };
    const bodyEl = document.querySelector('.ad-body');
    return { shell: info('.ad-shell'), side: info('.ad-side'), main: info('.ad-main'),
             top: info('.ad-top'), body: info('.ad-body'),
             bodyScrollH: bodyEl ? bodyEl.scrollHeight : null,
             visibleText: (bodyEl?.innerText || '').slice(0, 80) };
  });
  console.log(name, JSON.stringify(r, null, 2), errors.length ? 'ERRORS: ' + errors.join(' | ') : '');
  await ctx.close();
}
await browser.close();
