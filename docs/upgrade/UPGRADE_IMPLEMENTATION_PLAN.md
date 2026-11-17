# Upgrade 13 implementation plan: ezzyousef-site

Smallest maintainable design: keep the single content document, the existing
dashboard and the three-function API. Add shared pure modules under
`src/lib/` that both the browser and the serverless functions import, so the
validation the dashboard shows is the validation the server enforces. No new
framework, no router library, no new runtime dependency.

Every bug fix starts with a failing test (vitest for code, the site check for
rendered behaviour).

## Milestone A: correctness and security

| Step | Change | Test first | Acceptance |
|---|---|---|---|
| A1 | Escape `<`, `>`, `&`, U+2028/9 in JSON-LD; scheme-check every prerendered link (S1, S2) | `tests/unit/render-static.test.js`: a title containing `</script>` stays inside the script; a `javascript:` URL is not written | Static HTML has no injectable script end; unsafe links dropped |
| A2 | `src/lib/safe-url.js` used by the site, the prerender and the server validator | unit tests on schemes, whitespace and case tricks | Only http, https, mailto, tel, `/` and `#` pass |
| A3 | Content schema: `schemaVersion`, `migrate()` (old documents gain new fields with defaults, nothing removed), `validate()` (types, URL schemes, hex colours, font names from the offered list, numeric ranges, sizes) used by the server on every save and by the build (S4) | `tests/unit/content-schema.test.js`: the shipped seed and a pre-upgrade document migrate and validate; a CSS-injection font name and a `javascript:` link are rejected | Live content survives the migration with every original field intact |
| A4 | Upload: sniff the real format from the bytes, refuse SVG and anything not PNG/JPEG/WebP/GIF, rate limit uploads (S3, S7) | `tests/unit/upload.test.js` with mocked Blob and sharp | An SVG or an HTML file labelled `image/png` is refused |
| A5 | Auth: client IP from the first `x-forwarded-for` hop (or `x-real-ip`), token 2 h with issuer and audience, renewal endpoint that needs a valid token (S7, S8) | `tests/unit/auth.test.js` | Expired, wrong-audience and wrong-secret tokens fail; renewal returns a fresh token |
| A6 | Publishing safety: drafts and history; a preview deployment may save drafts but not publish unless `ALLOW_PREVIEW_PUBLISH=1`; the deploy hook fires only in production (S5, S6) | `tests/unit/content-api.test.js` with mocked Blob | Publishing from `VERCEL_ENV=preview` is refused; each publish first archives the previous version; history is capped |
| A7 | CSP and cache headers in `vercel.json`: hashed bundle in its own directory served immutable, images revalidated daily; 404 handling (S9, S10) | `tests/unit/vercel-config.test.js` | CSP has no `unsafe-eval`, scripts only from self, `frame-ancestors 'none'`; site check runs with the CSP applied and reports no violations |
| A8 | 360 px overflow, label mismatches, target size, keyboard access to the viewer, reduced motion for "Back to top" | site check (fails at baseline) | 0 axe violations, no overflow, every zoomable image in a button |

## Milestone B: core value

| Step | Change | Acceptance |
|---|---|---|
| B1 | Publication metadata: optional `doi`, `year`, `type` fields; DOI derived from doi.org URLs; formatted citation and BibTeX per paper and for the whole list (generated locally, no network); text search and filters (first author, year) | Unit tests on citation and BibTeX output, including escaping; search filters the list |
| B2 | Dashboard DOI lookup through Crossref, and ORCID import listing works not yet on the page; both show a field-by-field review and change nothing until the owner applies them. Runs in the owner's browser only when the owner clicks; disclosed in the panel | Unit tests on response parsing and diffing with recorded-shape fixtures; not verified against the live APIs |
| B3 | Software showcase: per-project `status`, `platforms`, `version`, `channel`, `license`, `docs`, `changelog`, `downloads[]` fields, all editable in the dashboard; cards state plainly when no installer is offered; a project detail page per project at `/software/<slug>/`, prerendered so it exists without JavaScript | Unit tests on slugs and labels; site check visits every page in the sitemap |
| B4 | Custom content blocks: owner-defined sections (talks, writing, CV, collaboration…) with heading, paragraphs and links, rendered only when present | Unit test on migration default (empty); no invented content |

## Milestone C: CMS workflow, accessibility and UX

| Step | Change |
|---|---|
| C1 | Dashboard: **Save draft** (server copy, not public), **Publish**, version history list with load-into-editor, export a backup file and import one (validated) |
| C2 | Accessibility checker panel before publishing: text contrast of the chosen theme in light and dark mode against WCAG AA, images without a caption, empty link labels, unsafe links, missing headings |
| C3 | Lazy-load the dashboard so visitors do not download it |
| C4 | 404 page prerendered with the site's look |

## Milestone D: SEO and performance

| Step | Change |
|---|---|
| D1 | `sitemap.xml`, `robots.txt`, canonical URL, absolute `og:image`, `twitter:card`, per-project titles and descriptions; site URL from `SITE_URL` (default the current vercel.app address, which the existing JSON-LD already uses) |
| D2 | Measure: bundle sizes before/after, image weights, Lighthouse if it runs locally |

## Milestone E: docs

README update (new env vars, publishing flow, rollback), the five reports.

## Left out by design (owner decisions)

Bilingual toggle, contact form (needs a mail backend and a privacy decision),
self-hosted fonts (removes the Google Fonts request; changes how font choice
works), HSTS header on the custom domain, branch-specific Blob stores,
deployment rollback in Vercel, adding more software projects or new claims.
