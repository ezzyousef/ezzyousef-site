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

## Design pass (fonts and style)
Not done. The pass needs self-hosted fonts (`@fontsource` packages), and the install command was refused by the permission system in this session. Existing choices already avoid the template look: Newsreader (serif headings), Archivo (text), IBM Plex Mono (labels), a warm off-white ground, one red accent, 2px radius, hairline rules, no gradients. Before/after screenshots and a font/palette change are therefore not included; current screenshots are in docs/upgrade/screenshots.
