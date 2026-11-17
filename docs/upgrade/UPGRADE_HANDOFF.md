# Upgrade 13: handoff

State: dashboard, security, schema and site work finished and checked on branch upgrade/13-ezzyousef-site. Nothing deployed or merged.

Owner decisions:
1. Drafts and history are stored as public Blob objects with random names; moving to a private store is your call.
2. Preview deployments cannot publish unless ALLOW_PREVIEW_PUBLISH=1.
3. The zod override in package.json clears the audit; remove it once @vercel/blob ships a fixed dependency.
4. Font/style pass: approve `npm i @fontsource-variable/newsreader @fontsource-variable/archivo @fontsource/ibm-plex-mono` to self-host the fonts (removes the Google Fonts request; CSP would then drop the Google hosts when the default fonts are used).
5. Lighthouse was not run.
6. Verify on a Vercel preview: real login, draft/publish, DOI lookup, rollback.
