import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const secrets = readFileSync('C:/Users/ezzyo/Desktop/Website Setup/SECRETS.txt', 'utf8');
const pw = (secrets.match(/^\s+([a-z]+-[a-z]+-[a-z]+-\d+)\s*$/m) || [])[1];

// Edge's "auto dark mode for web contents" is a Chromium flag.
const modes = [
  ['forced-colors', { forcedColors: 'active' }, []],
  ['auto-dark-flag', {}, ['--enable-features=WebContentsForceDark']],
];

for (const [name, ctxOpts, args] of modes) {
  const browser = await chromium.launch({ channel: 'msedge', args });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  await page.goto('https://ezzyousef-site.vercel.app/#admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  try {
    await page.fill('.ad-login input[type=password]', pw);
    await page.click('.ad-btn.primary');
    await page.waitForTimeout(2500);
  } catch { /* login box not reachable */ }
  await page.screenshot({ path: `.test/mode-${name}.png` });
  const r = await page.evaluate(() => {
    const el = document.querySelector('.ad-nav button') || document.querySelector('.ad-login h2');
    const shell = document.querySelector('.ad-shell') || document.querySelector('.ad-login-wrap');
    const cs = el ? getComputedStyle(el) : null;
    const ss = shell ? getComputedStyle(shell) : null;
    return { sample: el?.textContent?.slice(0,20) ?? null,
             textColor: cs?.color, textBg: cs?.backgroundColor,
             shellBg: ss?.backgroundColor };
  });
  console.log(name, JSON.stringify(r));
  await browser.close();
}
