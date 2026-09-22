/**
 * Bakes the live content into the build.
 *
 * Without this the build ships data/seed.json, so the first frame showed the
 * seed portrait and seed text before the fetched content replaced it. Now the
 * build starts from whatever is saved, and the swap has nothing to swap.
 *
 * If the site is unreachable (first ever deploy, storage down, offline build)
 * it falls back to the seed and the build still succeeds.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SITE = process.env.CONTENT_SOURCE || 'https://ezzyousef-site.vercel.app';
const OUT = 'src/content.generated.json';

function merge(base, override) {
  if (Array.isArray(override)) return override;
  if (override && typeof override === 'object' && !Array.isArray(base) && base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(override)) out[k] = merge(base[k], override[k]);
    return out;
  }
  return override === undefined ? base : override;
}

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));

let content = seed;
let note = 'seed only';
try {
  const res = await fetch(`${SITE}/api/content?build=${Date.now()}`, { cache: 'no-store' });
  if (res.ok) {
    const body = await res.json();
    if (body && body.content) {
      content = merge(seed, body.content);
      note = 'live content baked in';
    }
  }
} catch (e) {
  note = `could not reach ${SITE} (${e.message}); using seed`;
}

writeFileSync(OUT, JSON.stringify(content, null, 2));
console.log(`${OUT}: ${note} — portrait ${content.hero.portrait.slice(0, 60)}`);
