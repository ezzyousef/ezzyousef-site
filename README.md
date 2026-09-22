# ezzyousef.com, personal research site

A React site with a built-in dashboard. Content, images, colours and fonts are
all edited from the dashboard; nothing needs a code change.

- **Public site** — everything at `/`
- **Dashboard** — add `#admin` to the URL, then sign in

## How it fits together

| Piece | What it does |
|---|---|
| `data/seed.json` | The content shipped with the build. Used until the first dashboard save, and as a fallback if storage is unreachable. |
| `api/content.js` | Reads and writes the live content document in Vercel Blob. |
| `api/auth.js` | Checks the password and issues an 8-hour token. |
| `api/upload.js` | Receives an image and stores it in Blob. |
| `src/theme.js` | Turns the theme settings into the whole stylesheet. |
| `src/site/Site.jsx` | Renders the public page from the content object. |
| `src/admin/Admin.jsx` | The dashboard. |

Only three serverless functions, so there is plenty of room under Vercel's limit.

## Setting it up on Vercel

1. **Import the repository** at vercel.com/new and deploy it. The first deploy
   will work, but saving will not until step 3.
2. **Add Blob storage**: project → Storage → Create → Blob. Connect it to the
   project. That sets `BLOB_READ_WRITE_TOKEN` for you.
3. **Add two environment variables** under Settings → Environment Variables:
   - `ADMIN_PASSWORD_HASH` — run `npm run hash -- "your-password"` locally and
     paste the line it prints.
   - `JWT_SECRET` — a long random string:
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
4. **Redeploy** so the new variables are picked up.

## Deploying

Saving in the dashboard also asks Vercel to rebuild, so the copy of the
content baked into the build stays current and a first-time visitor never sees
the previous version for a moment. This needs one environment variable:

- `DEPLOY_HOOK_URL` — Project Settings, Git, Deploy Hooks. Create one named
  `content-save` on branch `main` and paste the URL it gives you.

Without it, saving still works; the baked copy simply waits for the next push.
Rebuilds are spaced at least three minutes apart, so a burst of edits cannot
start a queue of builds.


The GitHub repository is connected to the Vercel project, so **every push to
`main` deploys itself**. No command to run: commit, push, and the live site
updates in about a minute. Vercel builds a preview for any other branch.

Content edited in the dashboard does not need a deploy at all; it saves
straight to storage and is live immediately.

## Editing

Open the site, add `#admin`, sign in. The page behind the panel updates as you
type, and nothing is public until you press **Save**. **Preview site** hides the
panel so you can see the page on its own; Esc brings it back.

## Running locally

```
npm install
npm run dev
```

The dashboard needs the API, which only runs on Vercel, so locally the site
renders from `data/seed.json` and saving is unavailable.

## Security notes

- The password is stored only as a bcrypt hash, in an environment variable.
- The login token is held in memory, never in localStorage, so closing the tab
  signs you out.
- Login attempts are rate limited.
- Never commit a real `.env` file. `.gitignore` already excludes it.
