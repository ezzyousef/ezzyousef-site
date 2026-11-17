# Upgrade 13 audit: ezzyousef-site

Repository: `E:\Lab Apps\ezzyousef-site`, cloned from `github.com/ezzyousef/ezzyousef-site`.
Audited at `main` @ `2f40849` on 2026-11-16. Work branch: `upgrade/13-ezzyousef-site`.

## What the site is

A single-page React 19 / Vite 8 personal research site deployed on Vercel. All
content lives in one JSON document (`data/seed.json` in the repository, and
`content.json` in Vercel Blob once the dashboard has saved). A dashboard at
`#admin` edits that document live in the page; **Save** writes it to Blob and
asks Vercel for a rebuild through a deploy hook. Three serverless functions:
`api/auth.js` (bcrypt password check, 8-hour HS256 JWT), `api/content.js`
(read/write content, deploy hook), `api/upload.js` (image upload, sharp resize
to WebP). The build bakes the live content into the bundle
(`scripts/fetch-content.mjs`) and writes a plain-HTML copy plus JSON-LD into
`dist/index.html` (`scripts/prerender.mjs`).

## Baseline (before any change)

| Check | Command | Result |
|---|---|---|
| Build | `CONTENT_SOURCE=http://127.0.0.1:9 npm run build` (offline: falls back to the seed) | passes; JS 282.73 kB (83.33 kB gzip), one chunk, admin included |
| Unit tests | none existed | 0 tests |
| Lint | none existed; with the new `eslint.config.js` | 1 error (unused `get` in Admin.jsx), 1 warning |
| HTML validity | `html-validate "dist/**/*.html"` | 3 errors (telephone number spaces in link text) |
| Site check (new, local) | `node tests/e2e/site-qa.mjs` | 9 problems, listed below |
| Dependency audit | `npm audit` | 8 high: vite 8.0.10, sharp 0.34.5 (libvips/libheif/librsvg), undici, zod (via @vercel/blob), source-map-js |

Site check at baseline (Chrome headless, reduced motion, all external requests blocked):

- 360 px: **horizontal scroll of 12 px**. Cause: the sticky section bar's scroll
  container is a flex child without `min-width: 0`, so it grows to its content.
- axe `label-content-name-mismatch` (serious, 18 nodes): the section-number
  links (`aria-label="Link to …"` while the visible text is "01") and the
  "cite" buttons (`aria-label="Copy the citation for …"`).
- axe `target-size` (serious, mobile): research-group links are too close together.
- **19 zoomable images are not reachable by keyboard**: the click handler is on
  the `<img>` itself, so the image viewer cannot be opened without a mouse.
- **No 404 page**: `vercel.json` rewrites every path to `index.html`, so a
  mistyped URL shows the home page with status 200.

## Feature and risk matrix against the brief (`13_ezzyousef-site.md`)

DONE = present and working, PARTIAL = present with gaps, MISSING = absent.

| # | Brief item | State at baseline | Evidence |
|---|---|---|---|
| 1 | Research directions, publications, software, methods, figures, CV, collaboration, open-source links | PARTIAL | Research, publications, software, experience, background and contact sections exist. No talks, writing, CV link or custom sections; adding them needs owner content |
| 2 | Software showcase with platforms, version/channel, downloads, docs, changelog, license, accurate unpublished labels | PARTIAL | Cards with screenshots, facts and a repository link. No status, platform, version, license, docs, changelog or download fields; no project detail pages |
| 3 | DOI/ORCID/Crossref metadata behind manual review, citation formatting, BibTeX, search, filters | PARTIAL | Plain-text "cite" copy and a first-author filter. No DOI field, no lookup, no BibTeX, no search |
| 4 | CMS: draft, preview, publish, version history, blocks, a11y checker, file constraints, sitemap/SEO, backups | PARTIAL | Live in-page preview before Save and a hide-panel preview. Save publishes immediately; no server draft, **no version history or backup: every save overwrites the only copy**; no validation; no sitemap or robots.txt; `og:image` is relative |
| 5 | UX: typography, contrast, reduced motion, mobile, detail pages, contact, navigation, bilingual | PARTIAL | Reduced motion honoured for the tilt and CSS transitions, but "Back to top" always smooth-scrolls; the mobile overflow and keyboard problems above; no project pages. Bilingual is "if desired": owner decision |
| 6 | Security: auth, JWT, rate limit, sanitisation, uploads, deploy hook, Blob ACLs, sessions, contact privacy, no analytics | PARTIAL | bcrypt hash in env, token in memory, rate limit on login. Findings below |
| 7 | Safe publishing: branch previews, rollback, content fallback, no accidental production change | PARTIAL | Seed fallback when Blob is unreachable works. **A preview deployment shares the Blob store, so saving from a preview's dashboard overwrites production content and fires the production deploy hook** |

## Security findings

| ID | Severity | Finding | File |
|---|---|---|---|
| S1 | High | The prerendered JSON-LD is `JSON.stringify` output inside `<script>`; a `</script>` in any title, author or tag closes the element and the rest is parsed as HTML (stored XSS in the static page, which is the copy crawlers and no-JS visitors get) | `scripts/prerender.mjs` |
| S2 | Medium | Links in the prerendered HTML are written without a scheme check; a `javascript:` URL saved in the dashboard becomes a live link in the static copy. (React 19 blocks it in the hydrated page, the static copy does not) | `scripts/prerender.mjs` |
| S3 | Medium | Upload trusts the client's declared MIME type and accepts SVG, stored on a public Blob URL. An SVG can carry script that runs when the file is opened directly | `api/upload.js` |
| S4 | Medium | Saved content is not validated: any object up to 2 MB is accepted, including unsafe URL schemes, non-hex colours and font names that are interpolated straight into the generated stylesheet (CSS injection) | `api/content.js`, `src/theme.js` |
| S5 | Medium | Saving from a preview deployment writes production content (see item 7) | `api/content.js` |
| S6 | Medium | No version history: an accidental save, a bad import or a compromised token loses the only copy of the content | `api/content.js` |
| S7 | Low | Rate-limit key is the whole `x-forwarded-for` string; behind a proxy chain every distinct chain is a new bucket. Uploads are not rate limited | `api/auth.js`, `api/upload.js` |
| S8 | Low | Token lives 8 hours with no audience claim and no way to renew without the password; a shorter token with renewal shrinks the window if one leaks | `api/_lib/auth.js` |
| S9 | Low | No Content-Security-Policy header | `vercel.json` |
| S10 | Low | `/assets/*` is served `immutable` for a year, but the images there are not content-hashed; replacing `portrait.jpg` under the same name would be cached by returning visitors indefinitely | `vercel.json` |
| S11 | Info | The whole dashboard (about a third of the bundle) is downloaded by every visitor | `src/App.jsx` |

No secrets are committed: `.env*` is ignored, `.env.example` holds only empty
names, and the client bundle contains no keys (checked by grepping `dist/` for the
variable names `BLOB_READ_WRITE_TOKEN`, `JWT_SECRET` and `ADMIN_PASSWORD`, and
the whole repository for Blob token (`vercel_blob_rw_`) and bcrypt hash
(`$2a$`/`$2b$`) patterns: no matches). There are no analytics or
trackers. The only third party contacted by visitors is Google Fonts.

## Content flagged for the owner (not changed)

These are owner statements; nothing here was edited, because the brief forbids
inventing or "correcting" claims without the owner.

1. **Impact factors and citation counts** in the publication tags ("JIF 9.5",
   "15 citations") are dated September 2026 in the note and will go stale. The
   brief says no invented impact factors or citation counts; these are owner
   entered, but they cannot be verified offline. Consider removing them or
   reviewing them on a schedule.
2. **Stat band "4 research tools built"** and the software intro ("Four desktop
   applications") list four tools; the owner's portfolio now also includes
   Figure Studio, researchflow-ai, smartwrite-ai, stagecraft and screen-recorder.
   Whether any of them should appear is the owner's call.
3. **Contact email** is the AUC address while the current position is at the
   University of Toronto. Confirm it is still monitored.
4. **A personal phone number** is published on the page. Confirm that is intended.
5. **"Best Researcher Award, Science Father" (2024)**: review whether to keep
   it; awards from commercial award organisers are sometimes viewed sceptically
   by academic readers.
6. **Software status**: all four projects carry an "Open source" tag, but no
   project lists a licence, platforms, a version or an installer. The new
   fields for these are empty; the page now says plainly when no installer is
   offered.
7. **First publication link** points to an RSC landing page rather than its DOI
   (`10.1039/d6ta05502h`, inferred from the URL path; not verified online).
8. The footer says "Updated September 2026".

## Constraints observed

No deploy, no DNS or Vercel setting change, no login, no API key used. The
build's live-content fetch was pointed at an unreachable local address during
all local builds so nothing left this PC. External links were not fetched.
