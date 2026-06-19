# Transcript Studio

Record or import a transcript, then ask an LLM about it.

Transcript Studio is a web app for capturing or importing audio, turning it into
a text transcript, and then chatting with an LLM about the contents. This
repository currently contains the **application shell** only — the layout and UI
scaffold. Transcription, storage, auth, and chat are not implemented yet.

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) with **TypeScript** and a `src/` directory
- **[Tailwind CSS v4](https://tailwindcss.com)** + **[shadcn/ui](https://ui.shadcn.com)** components
- **[ESLint](https://eslint.org)** + **[Prettier](https://prettier.io)** (with `prettier-plugin-tailwindcss`)
- Planned services (not wired up yet):
  - **[Neon](https://neon.tech)** — serverless Postgres
  - **[AssemblyAI](https://www.assemblyai.com)** — speech-to-text transcription
  - **[OpenAI](https://openai.com)** — LLM chat over transcripts

## Local setup

Requires **Node.js 20+**.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file and fill in values as you wire up services:

   ```bash
   cp .env.local.example .env.local
   ```

   See `.env.local.example` for every variable and what it's for. To generate a
   value for `AUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Script                 | Description                       |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Start the development server      |
| `npm run build`        | Production build                  |
| `npm run start`        | Serve the production build        |
| `npm run lint`         | Run ESLint                        |
| `npm run format`       | Format the codebase with Prettier |
| `npm run format:check` | Check formatting without writing  |

## Architecture

The intended end-to-end flow once services are wired up:

```
 ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 │  Capture / Import │     │  Transcription   │     │  Backend + DB    │     │    LLM Chat      │
 │  audio in browser │ ──▶ │  AssemblyAI API  │ ──▶ │  Next.js routes  │ ──▶ │   OpenAI API     │
 │  (record/upload)  │     │  (speech-to-text)│     │  + Neon Postgres │     │  (ask questions) │
 └──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
                                                            │                        ▲
                                                            └────────────────────────┘
                                                        transcript stored, then used as
                                                            context for chat answers
```

- **Capture / Import** — the user records audio in the browser or uploads a file.
- **Transcription** — audio is sent to AssemblyAI, which returns a text transcript.
- **Backend + DB** — Next.js route handlers persist transcripts in Neon Postgres.
- **LLM Chat** — stored transcripts are passed to OpenAI as context so the user
  can ask questions about them.

## Status

✅ App shell: sidebar (transcript list placeholder) + main welcome screen
⬜ Audio capture / import
⬜ Transcription pipeline
⬜ Database + persistence
⬜ Auth (single-user)
⬜ LLM chat
