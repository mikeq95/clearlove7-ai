# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An iMessage-styled AI chat companion for [mikeq95blog](https://mikeq95.github.io/blog). It works two ways:

- **Standalone chat** at `/` — a normal chat UI backed by DeepSeek, Claude, GLM (智谱 AI), Kimi
  (Moonshot AI), or Qwen (阿里云百炼).
- **"Explain this" mode**, triggered from a blog post with `/?word=<term>&postId=<id>` — fetches the
  post's content from the blog's RSS feed and asks the model to explain `word` in that context.

Conversations, settings, and API keys all live in the browser's `localStorage`. There is no database
and no server-side account system — Clerk sign-in is optional UI polish, not an access gate.

## Commands

```bash
npm install
cp .env.example .env.local   # fill in VITE_CLERK_PUBLISHABLE_KEY

npm run dev       # Vite dev server, UI only — /api/explain will 404
npm run start     # vercel dev --listen 5173 — client + /api/explain (needed to exercise the API locally)
npm run build     # production build to dist/
npm run preview   # preview the production build
npm run lint      # ESLint
npm run test      # Vitest (runs once, not watch mode)
```

To run a single test file: `npx vitest run src/lib/conversations.test.js`.

CI (`.github/workflows/ci.yml`) runs lint, test, and build on every push/PR to `main`.

## Architecture

**Bring-your-own-key, no backend state.** There are no server-side AI provider credentials. Each
user pastes their own API key into Settings (`src/pages/SettingsPage.jsx`); it's stored in
`localStorage` as `apiKey_<provider>` and sent to `/api/explain` only when that user sends a message.
`api/explain.js` is the only server code — a single Vercel serverless function that proxies the
request to whichever provider was picked and streams the response back to the client. It normalizes
two provider API shapes behind one interface: DeepSeek/GLM/Kimi/Qwen are all OpenAI-compatible
chat-completions (GLM/Kimi/Qwen share one `handleOpenAICompatible` handler — only the endpoint URL
in `OPENAI_COMPATIBLE_ENDPOINTS` differs; DeepSeek stays separate because `deepseek-reasoner` needs
special system-role handling and reasoning-stream extraction), while Claude is the Messages API with
a different SSE event shape and image-block format. It also injects context server-side: RSS-fetched
post content for `postId`, or a fallback `context` string.

**Wire protocol**: the response body is newline-delimited JSON, not raw text or SSE — each line is
`{"c":"<content delta>"}` or `{"r":"<reasoning delta>"}` (`streamOpenAI` in `api/explain.js` writes
it; `src/lib/streamParser.js`'s `createReasoningStreamParser` reads it back on the client, buffering
across `TextDecoder`/HTTP chunk boundaries since a line can split anywhere). Only `deepseek-reasoner`
ever populates `r` events — DeepSeek's `reasoning_content` field, forwarded end-to-end so `useChat.js`
can track it as a separate `message.reasoning` string alongside `message.content`. Every other
provider/model only ever emits `c` events, so `reasoning` stays structurally absent on those messages
(not `''`) — this is what lets `ThinkingPanel.jsx` render nothing for them.

**Conversation persistence** (`src/lib/conversations.js`) is a small localStorage-backed store, not a
database — no async, no schema migrations. Two key patterns:
- Metadata list under `conversations` (capped at 200), each conversation's messages under
  `conv_messages_<id>` separately, so listing conversations doesn't require loading all message
  bodies.
- All writes funnel through `safeSetItem`, which swallows quota errors and returns a boolean rather
  than throwing — callers (`useChat`'s `persistFinal`) surface a user-facing error instead of
  crashing when storage is full.

**Streaming state lives in `src/hooks/useChat.js`.** `sendToAPI` reads `provider`/`model`/`apiKey`
from `localStorage` at call time (not from props/state) specifically so a change saved in Settings
takes effect on the next message without a page refresh. It appends a placeholder assistant message,
then feeds each decoded chunk through `createReasoningStreamParser` and mutates `content`/`reasoning`
in place as deltas arrive via a `ReadableStream` reader. On abort (user hit "stop"), it still persists
whatever streamed so far rather than discarding it.

**Assistant-message rendering** (`src/components/MessageList.jsx`) drives several mid-conversation
states off plain booleans computed per message, not separate components with their own state:
`isStreamingContent` (last message in the group, still loading, content non-empty) adds an
`.is-streaming` class that draws a CSS-only blinking cursor after the last rendered block — never a
literal character in the markdown string, since react-markdown would risk re-parsing it as part of an
unclosed construct. `hasReasoning` (`!!msg.reasoning`) renders `ThinkingPanel.jsx` above the answer,
collapsed by default, shimmering while still generating; it renders nothing when absent. Fenced code
blocks route through a lazy-loaded `CodeBlock.jsx` (header with language label + copy button, native
`showLineNumbers`) — `markdownComponents.pre` strips react-markdown's default `<pre>` wrapper so the
global `.markdown-body pre` rule doesn't double-box `CodeBlock`'s own bordered card.

**Routing is in `src/App.jsx`**: `/` (MainPage, chat), `/chats`, `/starred`, `/settings`, `/sign-in`
— all but MainPage are lazy-loaded. `MainPage.jsx` is the largest piece of client logic: it owns the
scroll-position tracking (sticky-to-bottom while streaming, but a manual scroll-up or a wheel/touch
event moving upward immediately and synchronously disables auto-scroll to avoid fighting the user),
conversation selection/creation, and the `?word=&postId=` auto-trigger effect for explain-mode.
Conversation switching from the sidebar can arrive either via URL params (word mode) or via
`navigate('/', { state: { convId } })` (regular chat mode) — both are handled by separate effects in
`MainPage`, ordered so the router-state effect wins if both would fire on mount.

**Styling**: Tailwind v4 (via `@tailwindcss/vite`, no separate config file) plus CSS custom properties
defined in `src/index.css` (`--bg`, `--text-light`, `--border`, `--imessage-blue`, `--sans`, `--mono`,
etc.) for the iMessage-bubble look. Some pages (`SettingsPage.jsx`) use inline `style` objects instead
of Tailwind classes — that's the existing convention there, not an oversight.

**Security boundary in `api/explain.js`**: since the client controls `provider`/`model`/`apiKey` and
the function proxies to arbitrary provider hosts, it enforces same-origin requests (`isAllowedOrigin`)
and caps message count/length/image size/key length before forwarding anything upstream.

## Deployment

Deployed on Vercel. `vercel.json` rewrites each client-side route (`/chats`, `/starred`, `/settings`,
`/sign-in`) to `index.html` individually, not via a catch-all — a catch-all (`/((?!api/).*)`) breaks
`vercel dev` locally, since Vite's dev-mode asset URLs (`/src/main.jsx`, etc.) aren't real files on
disk for Vercel's static-file check to match, so they'd get misrouted to `index.html` too and fail
Vite's import analysis.
