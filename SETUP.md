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

## Running WikiLM Without Opening a Terminal (macOS)

After one-time setup above, there are two ways to start WikiLM without a terminal:

### Option A · Double-click launcher

1. In Finder, open `SecondBrain/scripts/` and find `launch-wikilm.command`.
2. First run only: right-click it → **Open** → confirm macOS's security prompt. After that, double-click always works.
3. A short Terminal window flashes while the server boots. The app opens at `http://localhost:3000` automatically.
4. Drag `launch-wikilm.command` onto the Dock or the Desktop for one-click access. The server keeps running after the Terminal window closes.

Behaviour notes:

- If the dev server is already running, the launcher just opens the browser tab (or PWA window — see next option).
- Server logs go to `backups/.wikilm-dev.log` — check that if something looks wrong.
- **Closing the browser or PWA window does NOT stop the server** — it's detached on purpose so your next launch is instant. Stop it when you want to free the port or memory.

### Stopping the server

Three options, easiest first:

1. **Double-click `scripts/stop-wikilm.command`** — kills whatever's listening on :3000, reports status, exits. Drag it to the Dock next to the launcher so stop is a one-click sibling of start.
2. **`lsof -ti :3000 | xargs kill`** — one-liner in any terminal.
3. Leave it running. The server idles at ~200 MB and costs nothing until the next ingest.

### Option B · Install as a web app

Once `http://localhost:3000` is open:

- **Chrome / Edge / Arc**: address bar → **⋯ menu** → *Install app* (or **Install WikiLM**). Get a standalone window with no address bar, a Dock icon, and its own App Switcher entry.
- **Safari**: **File** → *Add to Dock…*. Works identically — native-feeling app window, native icon.

The manifest lives at `/manifest.webmanifest`; the app icon is a small SVG at `/icon.svg`. No extension or extra install needed.

### Recommended flow — keep ONE icon on the Dock

Put `launch-wikilm.command` on the Dock. That's it. When you click it:

- If the server isn't running, it boots in the background.
- If it's running, nothing's re-started — just the window opens.
- If you've installed the PWA, the launcher opens the **PWA standalone window** (no address bar, proper Dock icon). If you haven't, it falls back to a browser tab.

**Don't put the PWA icon on the Dock directly.** A PWA is just a browser window — clicking it when the server is down shows a "can't connect" error that won't retry even after you start the server (you'd have to hit Cmd+R inside the PWA window). The launcher handles the ordering: start the server, wait for readiness, only then open the window.

One click = fully working app. Add `stop-wikilm.command` right next to it on the Dock for one-click shutdown.

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
