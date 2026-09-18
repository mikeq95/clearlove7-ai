# Clearlove7 AI

An iMessage-styled AI chat companion for [mikeq95blog](https://mikeq95.github.io/blog). It works two ways:

- **Standalone chat** at `/` — a normal chat UI backed by DeepSeek, Claude, GLM (智谱 AI), Kimi (Moonshot AI), or Qwen (阿里云百炼).
- **"Explain this" mode**, triggered from a blog post with `/?word=<term>&postId=<id>` — fetches the
  post's content from the blog's RSS feed and asks the model to explain `word` in that context.

Conversations, settings, and API keys all live in the browser's `localStorage`. There is no database
and no server-side account system — Clerk sign-in is optional UI polish, not an access gate.

## Stack

React 19 + Vite + Tailwind v4, React Router, `react-markdown` + `react-syntax-highlighter` for
rendering replies, Clerk for optional sign-in. `api/explain.js` is a single Vercel serverless
function that proxies chat requests to whichever provider the user picked, streaming the response
back as plain text.

## Bring-your-own-key

There are no server-side AI provider credentials. Each user pastes their own DeepSeek / Claude / GLM /
Kimi / Qwen API key into **Settings**; it's stored in `localStorage` and sent to `/api/explain` only when that
user sends a message, which forwards it to the provider's API. Nothing is persisted server-side.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in VITE_CLERK_PUBLISHABLE_KEY
npm run dev                  # UI only — /api/explain will 404
```

To exercise `/api/explain` locally you need Vercel's dev server, which also serves the `api/`
directory as serverless functions:

```bash
npm run start                # vercel dev --listen 5173
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | For sign-in UI | Clerk publishable key (dashboard.clerk.com). The app still works without it for chat/settings, just without the sign-in button. |

## Scripts

```bash
npm run dev       # Vite dev server (client only)
npm run start     # vercel dev — client + /api/explain
npm run build     # production build to dist/
npm run preview   # preview the production build
npm run lint      # ESLint
npm run test      # Vitest
```

CI (`.github/workflows/ci.yml`) runs lint, test, and build on every push and PR to `main`.

## Deployment

Deployed on Vercel. `vercel.json` rewrites each client-side route (`/chats`, `/starred`, `/settings`,
`/sign-in`) to `index.html` so they work on direct navigation and page refresh. These are listed
explicitly rather than as a catch-all — a catch-all rewrite (`/((?!api/).*)`) breaks `vercel dev`
locally, because Vite's dev-mode asset URLs (e.g. `/src/main.jsx`) don't exist as real files on disk
for Vercel's static-file check to match, so they'd get incorrectly rewritten to `index.html` too.
