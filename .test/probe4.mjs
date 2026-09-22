import { chromium, devices } from 'playwright';
const browser = await chromium.launch();

// 1. Does the github.io redirect keep the #admin hash?
{
  const p = await (await browser.newContext()).newPage();
  await p.goto('https://ezzyousef.github.io/#admin', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  console.log('redirect landed on:', p.url());
}

// 2. The site and the dashboard in dark mode, on a phone
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], colorScheme: scheme });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('https://ezzyousef-site.vercel.app/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `.test/4-site-${scheme}.png` });
  const r = await p.evaluate(() => {
    const c = getComputedStyle(document.body);
    const h1 = document.querySelector('h1');
    const hc = h1 ? getComputedStyle(h1).color : null;
    return { bodyBg: c.backgroundColor, bodyColor: c.color, h1: h1?.textContent, h1Color: hc,
             textLen: (document.body.innerText || '').length };
  });
  console.log(scheme, JSON.stringify(r), errs.length ? 'ERRORS ' + errs.join('|') : '');
  await ctx.close();
}
await browser.close();
