# Upgrade 13: test report

Only checks actually run, on Windows 11, Node, local offline build.

| Check | Command | Before (baseline) | After |
|---|---|---|---|
| Unit tests | `npx vitest run` | none existed | 16 files, 146 tests passed |
| Page QA (axe WCAG A/AA, overflow, links, CSP applied; 3 viewports plus dark) | `node tests/e2e/site-qa.mjs` | 9 problems | 22 page checks, 0 problems (includes the signed-in dashboard with the API mocked) |
| HTML validity | `npx html-validate "dist/**/*.html"` | 3 errors | 0 errors |
| Lint | `npx eslint .` | not configured | 0 errors |
| Build | `npm run build:local` | passed | passed (vite 8.3.8) |
| Dependency audit | `npm audit` | 10 (8 high, 2 moderate) | 0 |

Found by the new dashboard check: hint text in the dashboard had 2.9:1 contrast; fixed (removed the opacity).

Not run: Lighthouse (not installed; installing was out of scope); live API calls to Crossref/ORCID (network not permitted; the lookups are unit-tested with a fake fetch); real Vercel Blob (no credentials used); real deployment or rollback.

Bundle (gzip, vite): main 82.55 kB, dashboard chunk 13.04 kB, loaded only on `#admin`. Prerendered index.html 19.8 kB.

Rerun after the design pass and review fixes: `npx vitest run` 146 passed; `npx eslint .` 0 errors; `npm run build:local` passed; html-validate 0 errors; `node tests/e2e/site-qa.mjs` 22 page checks, 0 problems. The race tests use an in-memory Blob stand-in, not real Blob.
