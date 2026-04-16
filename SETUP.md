# SecondBrain Setup Guide

## Quick Start (Just Run It)

This gets you running with mock data — no Claude CLI needed.

1. Open your terminal
2. Run `cd /path/to/SecondBrain/app`
3. Run `cp .env.example .env.local` — creates your settings file (mock mode by default)
4. Run `npm install` — wait for "added X packages"
5. Run `npm run db:push` — creates the SQLite database
6. Run `npm run dev` — you should see "Ready on http://localhost:3000"
7. Open http://localhost:3000 — the app runs with fake data

## Connecting the Real Claude CLI

To use real AI features instead of mock data:

### One-Time Setup

1. Install the Claude CLI: `npm install -g @anthropic-ai/claude-code` (or follow Anthropic's install instructions)
2. Verify it works: run `claude -p "Hello"` — you should see a response
3. Edit `app/.env.local` and change `MOCK_MODE=true` to `MOCK_MODE=false`
4. Restart the dev server: stop it with Ctrl+C, then run `npm run dev` again

### How It Works

- **Mock mode** (`MOCK_MODE=true`): All Claude operations return realistic fake data. Good for UI development and testing.
- **Real mode** (`MOCK_MODE=false`): The app shells out to `claude -p` for all wiki operations (ingest, query, lint, research). Requires the Claude CLI to be installed and authenticated.

## Every Time You Pull

1. Run `cd SecondBrain/app`
2. Run `npm install` — in case dependencies changed
3. Run `npm run db:push` — in case schema changed
4. Run `npm run dev`

## Project Structure

```
SecondBrain/
  app/                  # Next.js 16 web application
    src/
      app/              # Pages and API routes
      components/       # React components
      db/               # Drizzle ORM schema and connection
      lib/              # Utilities (claude-runner, etc.)
  raw/                  # Source material (read-only)
  wiki/                 # LLM-maintained markdown wiki
  projects/             # Multi-project data (created via the app)
  secondbrain.db        # SQLite database (auto-created)
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: shadcn/ui v4 (base-nova style), Tailwind CSS v4
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **AI**: Claude CLI (`claude -p`) for all wiki operations
- **Fonts**: Inter (body), JetBrains Mono (code/numbers)
