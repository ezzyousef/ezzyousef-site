# Upgrade 13: release notes (branch upgrade/13-ezzyousef-site, not deployed)

## Security
- Fixed script injection and unsafe links in the prerendered page; theme values are validated before reaching CSS.
- Tokens: 2 hours, audience claim, renewal, client-IP rate limit.
- Uploads judged by bytes, SVG refused, pixel cap, rate limit.
- Content API: validation on publish, previews cannot publish, deploy hook only in production, CSP and cache headers.
- Dependencies: vite 8.3.8, sharp 0.35.5, zod override ^4.6.7; npm audit now 0.

## Content and CMS
- Schema v2 with migration; existing live content loads unchanged.
- Dashboard: Save draft / Publish, Checks tab (validation and accessibility), History & backup (draft, 30 versions, JSON export/import), DOI lookup and ORCID import with manual review, software fields (status, platforms, version, channel, license, docs, changelog, downloads, project text), extra sections, ORCID and CV fields, accessible names on all row buttons.

## Site
- Project pages, 404, sitemap, robots, canonical tags, publication search, BibTeX export, keyboard-reachable image viewer.

## Review fixes (Codex review, 2 high and 4 medium; each began with a failing test)
- Content validation now checks the type of every field the page and dashboard read (lists, records, text, flags); drafts, imports and restored versions are checked too, so a malformed document can no longer be saved or loaded.
- Drafts are immutable objects plus a latest pointer, never deleted by another request (newest 10 kept); preview drafts are kept apart from production drafts.
- Publishing requires the revision the edit started from; a stale one is refused with 409. Every published revision is archived immutably, so a racing publish is never lost from history. Blob has no atomic compare-and-swap, so two requests passing the check in the same instant can still both publish; both are kept in history.
- Sessions: renewal keeps the original sign-in time (`auth_time`), 12-hour absolute limit, and a session version derived from the password hash so changing the password ends all sessions. Tokens issued before this change are refused once (sign in again).
- Rebuilds: the hook response is checked; a rebuild requested too soon is queued as pending and retried by the dashboard; the API returns a structured status, and the dashboard says saved / rebuild requested, pending or failed.
- The dashboard clears "unsaved" after a publish only if nothing was edited since the submitted snapshot.

## Design pass (fonts and style)
Kept the existing identity (serif headings, grotesk text, mono labels, warm off-white ground, one red accent, 2px radius, hairline rules, no gradients, no cards/shadows) and removed the remaining tells.
- Fonts (self-hosted via @fontsource, no request to any font service): Newsreader (headings, with italic), Archivo (text), IBM Plex Mono 400/500 (labels and figures).
- Palette (unchanged, light): ground #FCFBF8, ink #1A1A18, accent #A32617, muted #27406B, hairline #D7DAE2; dark values derive from these. All pairs pass the dashboard contrast check (4.5:1).
- Type details: balanced headings, `text-wrap: pretty` paragraphs, kerning, tabular lining figures for counters, dates and captions.
- Removed the pointer-follow 3D tilt on cards and figures (excessive hover motion).
- Google Fonts preconnects and the Google hosts in the Content-Security-Policy are gone; font-src is 'self'.
- Behaviour change: a font name other than these three, stored in old content, renders as the default; the dashboard picker offers only the shipped fonts.
- Screenshots: docs/design/before-{1440,390}-{top,full}.jpg and after-*. The "before" images were taken offline, so they show system fallback fonts instead of the Google fonts the live site loaded.
