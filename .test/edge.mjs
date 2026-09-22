import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const secrets = readFileSync('C:/Users/ezzyo/Desktop/Website Setup/SECRETS.txt', 'utf8');
const pw = (secrets.match(/^\s+([a-z]+-[a-z]+-[a-z]+-\d+)\s*$/m) || [])[1];

const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 1880, height: 950 } });
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => log.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => log.push(`PAGEERROR: ${e.message} @ ${(e.stack||'').split('\n')[1]||''}`));
page.on('requestfailed', (r) => log.push(`REQFAIL: ${r.url()} ${r.failure()?.errorText}`));

await page.goto('https://ezzyousef-site.vercel.app/#admin', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: '.test/edge-1.png' });
const before = await page.evaluate(() => ({
  rootKids: document.getElementById('root')?.children.length,
  hasLogin: !!document.querySelector('.ad-login'),
  bodyText: (document.body.innerText || '').slice(0, 60),
}));
console.log('BEFORE LOGIN', JSON.stringify(before));

if (before.hasLogin) {
  await page.fill('.ad-login input[type=password]', pw);
  await page.click('.ad-btn.primary');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test/edge-2.png' });
  const after = await page.evaluate(() => ({
    rootKids: document.getElementById('root')?.children.length,
    hasShell: !!document.querySelector('.ad-shell'),
    navBtns: document.querySelectorAll('.ad-nav button').length,
    bodyText: (document.body.innerText || '').slice(0, 80),
  }));
  console.log('AFTER LOGIN', JSON.stringify(after));
}
console.log('--- browser log ---');
console.log(log.slice(0, 15).join('\n') || '(none)');
await browser.close();
