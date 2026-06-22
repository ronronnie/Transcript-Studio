# Transcript Studio

Record or import a transcript, then ask an LLM about it.

Transcript Studio is a web app for capturing or importing audio, turning it into
a text transcript with speaker labels, and chatting with an LLM about the
contents. It's a single-user portfolio demo: one shared login, server-side
secrets, and global daily caps to protect API spend.

## Features

- **Capture** — record from the mic in-browser, **upload** audio (mp3/m4a/wav),
  or **paste** existing text.
- **Transcription** — AssemblyAI batch transcription with automatic language
  detection and speaker labels (`Speaker A: …`).
- **Chat** — ask questions about a transcript; answers stream token-by-token
  (OpenAI), with chat history persisted per transcript.
- **Manage** — rename, inline-edit, and delete transcripts; "Delete all my data".
- **Demo-ready** — a read-only sample transcript is seeded on an empty account.
- **Polish** — light/dark theme, toasts, loading skeletons, one-time consent
  notice, and global daily rate limits.

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **TypeScript**, `src/` dir
- **[Tailwind CSS v4](https://tailwindcss.com)** + **[shadcn/ui](https://ui.shadcn.com)** (base-ui / Nova preset)
- **[Drizzle ORM](https://orm.drizzle.team)** + **[Neon](https://neon.tech)** serverless Postgres
- **[AssemblyAI](https://www.assemblyai.com)** — speech-to-text (batch)
- **[OpenAI](https://openai.com)** — streaming chat (`gpt-4o-mini` by default)
- Custom cookie-signed single-user auth (no third-party provider)
- **[ESLint](https://eslint.org)** + **[Prettier](https://prettier.io)**

## Local setup

Requires **Node.js 20+**.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local env file and fill in values:

   ```bash
   cp .env.local.example .env.local
   ```

   Generate `AUTH_SECRET` with `openssl rand -base64 32`. See the
   [Environment variables](#environment-variables) table below.

3. Apply the database migrations to your Neon database:

   ```bash
   npm run db:migrate
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with
   `APP_USERNAME` / `APP_PASSWORD`.

### Scripts

| Script                | Description                      |
| --------------------- | -------------------------------- |
| `npm run dev`         | Development server               |
| `npm run build`       | Production build                 |
| `npm run start`       | Serve the production build       |
| `npm run lint`        | ESLint                           |
| `npm run format`      | Format with Prettier             |
| `npm run db:generate` | Generate a Drizzle migration     |
| `npm run db:migrate`  | Apply migrations to the database |
| `npm run db:studio`   | Open Drizzle Studio              |

## Environment variables

| Variable                     | Required | Description                                                 |
| ---------------------------- | -------- | ----------------------------------------------------------- |
| `DATABASE_URL`               | ✅       | Neon **pooled** Postgres connection string (`-pooler` host) |
| `ASSEMBLYAI_API_KEY`         | ✅       | AssemblyAI key (server-side transcription)                  |
| `OPENAI_API_KEY`             | ✅       | OpenAI key (server-side chat)                               |
| `APP_USERNAME`               | ✅       | Single login username                                       |
| `APP_PASSWORD`               | ✅       | Single login password                                       |
| `AUTH_SECRET`                | ✅       | Secret used to sign the session cookie                      |
| `LLM_MODEL`                  | —        | Chat model (default `gpt-4o-mini`)                          |
| `MAX_UPLOAD_SECONDS_PER_DAY` | —        | Global daily audio cap in seconds (default `1800`)          |
| `MAX_UPLOADS_PER_DAY`        | —        | Global daily upload/recording job cap (default `20`)        |
| `MAX_CHATS_PER_DAY`          | —        | Global daily chat-message cap (default `100`)               |
| `MAX_UPLOAD_MB`              | —        | Max upload file size in MB (default `25`)                   |

All secrets are read **server-side only**. The browser never connects to
Postgres or sees any API key. `.env.local` is git-ignored.

## Architecture

```
  Browser (client)                    Next.js server (API routes)            External
 ┌───────────────────┐    multipart   ┌──────────────────────────┐  upload  ┌──────────────┐
 │ Record / Upload / │ ─────────────▶ │ /api/transcripts/upload  │ ───────▶ │  AssemblyAI  │
 │ Paste             │                │ (validate, rate-limit)   │   poll   │ (speech→text)│
 └───────────────────┘                └────────────┬─────────────┘ ◀─────── └──────────────┘
          │                                         │ persist (Drizzle)
          │ poll /api/transcripts                   ▼
          │                              ┌──────────────────────┐
          │ ◀─────────────────────────── │  Neon Postgres       │
          │   status processing→ready    │  transcripts, messages│
          ▼                              └──────────┬───────────┘
 ┌───────────────────┐   stream tokens   ┌──────────▼───────────┐  chat   ┌──────────────┐
 │ Chat panel        │ ◀──────────────── │ /api/chat            │ ──────▶ │   OpenAI     │
 │                   │                   │ (transcript+history) │         │ (gpt-4o-mini)│
 └───────────────────┘                   └──────────────────────┘         └──────────────┘
```

- **Capture** → audio is forwarded to AssemblyAI; the raw audio is **never
  stored** on our side (the buffer is discarded after upload).
- **Backend + DB** → Next.js route handlers persist transcripts/messages in Neon
  via Drizzle. All DB access is server-side; no row-level security is needed.
- **Chat** → the full transcript + recent turns are sent to OpenAI and the answer
  is streamed back; messages are persisted per transcript.

## Phase 2 (future)

Tool/integration ideas, not yet built:

- **Gmail** — turn action items into draft emails / follow-ups.
- **Slack** — post a meeting summary to a channel.
- **Notion** — save transcripts and summaries to a workspace.
- **Jira** — create issues from detected action items.

These would live behind the same server-side API layer, with per-tool OAuth and
scopes. Retrieval (RAG) over long/multi-transcript context is also a candidate.

## Contributing / run locally

```bash
git clone git@github.com:ronronnie/Transcript-Studio.git
cd Transcript-Studio
npm install
cp .env.local.example .env.local   # fill in values
npm run db:migrate                 # set up the database
npm run dev                        # http://localhost:3000
```

Before opening a PR: `npm run lint`, `npm run format`, and `npm run build`
should all pass.

## Deploy to Vercel

1. **Push to GitHub** (already at `ronronnie/Transcript-Studio`).
2. In Vercel: **Add New → Project → Import Git Repository**, pick the repo.
   Framework preset auto-detects **Next.js**; leave build settings default.
3. **Environment Variables** — add these in the Vercel dashboard (Project →
   Settings → Environment Variables) for Production (and Preview if you want):
   - `DATABASE_URL` (Neon pooled string)
   - `ASSEMBLYAI_API_KEY`
   - `OPENAI_API_KEY`
   - `APP_USERNAME`, `APP_PASSWORD`
   - `AUTH_SECRET`
   - _(optional)_ `LLM_MODEL`, `MAX_UPLOAD_SECONDS_PER_DAY`,
     `MAX_UPLOADS_PER_DAY`, `MAX_CHATS_PER_DAY`, `MAX_UPLOAD_MB`
4. **Run migrations against the production DB** (from your machine, with the
   production `DATABASE_URL`): `npm run db:migrate`.
5. **Deploy.** Future pushes to `main` auto-deploy.
6. Visit the deployment, sign in with `APP_USERNAME` / `APP_PASSWORD`.

> Tip: use a Neon **pooled** connection string on serverless. Keep API spend
> limits set in the AssemblyAI/OpenAI dashboards as a backstop to the in-app caps.

## Status

✅ Capture (record / upload / paste) ✅ AssemblyAI transcription
✅ Neon + Drizzle persistence ✅ Single-user auth ✅ Streaming LLM chat
✅ Rename / edit / delete / delete-all ✅ Sample transcript ✅ Rate limits
✅ Consent notice ✅ Light/dark theme
