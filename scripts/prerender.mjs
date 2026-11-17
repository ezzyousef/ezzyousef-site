/**
 * Writes a plain-HTML copy of the content into dist/index.html, inside the
 * element React mounts into. React replaces it the moment the page loads, so
 * visitors never see it, but anything that reads HTML without running
 * JavaScript, search engines and link previews included, gets the real text.
 *
 * The rendering itself lives in render-static.mjs so it can be tested.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { renderHome } from './render-static.mjs';

const seed = JSON.parse(readFileSync('src/content.generated.json', 'utf8'));
const file = 'dist/index.html';
const html = renderHome(readFileSync(file, 'utf8'), seed);
writeFileSync(file, html);
console.log('Prerendered fallback written:', html.length, 'characters');
