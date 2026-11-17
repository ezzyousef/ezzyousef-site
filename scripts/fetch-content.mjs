/**
 * Bakes the live content into the build.
 *
 * Without this the build ships data/seed.json, so the first frame showed the
 * seed portrait and seed text before the fetched content replaced it. Now the
 * build starts from whatever is saved, and the swap has nothing to swap.
 *
 * If the site is unreachable (first ever deploy, storage down, offline build)
 * it falls back to the seed and the build still succeeds.
 *
 * `--offline` (npm run build:local) skips the fetch entirely, so a local
 * build never contacts the live site.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { migrate, validate } from '../src/lib/content-schema.js';
import { loadContent } from '../src/lib/merge.js';

const SITE = process.env.CONTENT_SOURCE || 'https://ezzyousef-site.vercel.app';
const OUT = 'src/content.generated.json';

const seed = JSON.parse(readFileSync('data/seed.json', 'utf8'));

let content = seed;
let note = 'seed only';
if (process.argv.includes('--offline')) {
  note = 'offline build; using seed';
} else try {
  const res = await fetch(`${SITE}/api/content?build=${Date.now()}`, { cache: 'no-store' });
  if (res.ok) {
    const body = await res.json();
    if (body && body.content) {
      content = loadContent(seed, body.content);
      note = 'live content baked in';
    }
  }
} catch (e) {
  note = `could not reach ${SITE} (${e.message}); using seed`;
}

// Bring content saved by an older version up to the current schema. The
// prerender escapes everything itself, so a validation problem is reported
// but does not stop the build.
content = migrate(content);
const problems = validate(content);
for (const p of problems.slice(0, 20)) console.warn(`content warning: ${p.path}: ${p.message}`);

writeFileSync(OUT, JSON.stringify(content, null, 2));
console.log(`${OUT}: ${note} — portrait ${content.hero.portrait.slice(0, 60)}`);
