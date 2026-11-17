/**
 * Writes the static pages into dist/ after the Vite build:
 *
 *   index.html                 the home page with a plain-HTML copy of the content
 *   software/<slug>/index.html one page per project
 *   404.html                   served by Vercel for any unknown path
 *   sitemap.xml, robots.txt
 *
 * React replaces the plain copy the moment a page loads, so visitors never
 * see it, but anything that reads HTML without running JavaScript, search
 * engines and link previews included, gets the real text.
 *
 * SITE_URL sets the canonical address (default: the current vercel.app
 * address). The rendering itself lives in render-static.mjs so it can be tested.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  renderHome, renderProject, render404, sitemap, robots, DEFAULT_SITE_URL,
} from './render-static.mjs';
import { projectSlugs } from '../src/lib/slug.js';

const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
const seed = JSON.parse(readFileSync('src/content.generated.json', 'utf8'));
const shell = readFileSync('dist/index.html', 'utf8');

writeFileSync('dist/index.html', renderHome(shell, seed, SITE_URL));

const slugs = projectSlugs(seed.software.projects);
slugs.forEach((slug, i) => {
  mkdirSync(`dist/software/${slug}`, { recursive: true });
  writeFileSync(`dist/software/${slug}/index.html`, renderProject(shell, seed, i, SITE_URL));
});

writeFileSync('dist/404.html', render404(seed));
writeFileSync('dist/sitemap.xml', sitemap(seed, SITE_URL));
writeFileSync('dist/robots.txt', robots(SITE_URL));

console.log(`Prerendered: home, ${slugs.length} project pages, 404, sitemap and robots for ${SITE_URL}`);
