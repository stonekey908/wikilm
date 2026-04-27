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

## Web Clipper (browser → WikiLM)

Send any webpage from your browser to WikiLM as a pending source. The page lands in the chosen project's library, ready for you to triage (approve, move to a different project, or delete) from `/sources`.

### Endpoints

Two endpoints accept clips:

| Endpoint | When to use | Body |
|---|---|---|
| `POST /api/sources/upload-md` | The clipper renders the page to markdown locally and sends the body. **Defaults to pending** — no flag needed. | `{ title, content, projectId, tags? }` |
| `POST /api/sources/ingest-web` | The clipper just sends the URL; the server does the fetch + ingest later. **Add `defer: true`** to land as pending. | `{ title, url, projectId, defer: true, ... }` |

### Find a project ID

`http://localhost:3000` → open the project switcher (top-left) → hover the project. The ID is also visible at `GET /api/projects` if you prefer JSON.

### Option A — MarkDownload (Chrome/Firefox)

1. Install [MarkDownload](https://github.com/deathau/markdownload).
2. Right-click the toolbar icon → **Options** → **Send to URL** section.
3. Configure:
   - **URL:** `http://localhost:3000/api/sources/upload-md`
   - **Method:** `POST`
   - **Content-Type:** `application/json`
   - **Body template:** `{ "title": "{pageTitle}", "content": "{markdown}", "projectId": <YOUR_PROJECT_ID> }`
4. Save options.
5. On any webpage, click the MarkDownload icon → **Download → Send to URL**. The page lands as pending in your project. Open `/sources` to triage it.

### Option B — Safari/Chrome bookmarklet (no install)

The fastest setup if you don't want a browser extension. Lists your projects in a prompt, accepts either the project number or its name.

**One-time setup: HTTPS dev server.** Modern browsers (Safari especially) refuse to fetch HTTP localhost from an HTTPS page (Wikipedia, blog posts, etc.). To make the bookmarklet work from real websites, run WikiLM on HTTPS:

1. Stop the dev server if it's running.
2. Start it with: `npm run dev:https` (this is `next dev --experimental-https` — Next.js auto-generates a self-signed cert).
3. Visit `https://localhost:3000` once. Safari will warn "this connection is not private". Click **Show Details** → **visit this website** → confirm. Safari remembers the trust forever.

After this one-time trust, the bookmarklet works on any webpage.

**Install the bookmarklet:**

1. In your browser's bookmark bar, create a new bookmark on any page (Safari: `⌘D` → save to **Favorites**; Chrome: `⌘D` → **Bookmarks Bar**).
2. Edit the saved bookmark's URL (Safari: `Bookmarks → Edit Bookmarks` → right-click the new entry → **Edit Address**; Chrome: right-click → **Edit**).
3. Replace the URL with the entire snippet below (one line, starts with `javascript:`):

```javascript
javascript:(async()=>{try{const r=await fetch('https://localhost:3000/api/projects');if(!r.ok)throw new Error('WikiLM not reachable at https://localhost:3000');const list=(await r.json()).projects||[];if(!list.length)throw new Error('No projects found');const menu=list.map((p,i)=>(i+1)+'. '+p.name).join('\n');const pick=prompt('Clip "'+document.title+'" to which project?\n\n'+menu,'1');if(!pick)return;const asNum=parseInt(pick,10);let proj=(Number.isFinite(asNum)&&asNum>=1&&asNum<=list.length)?list[asNum-1]:list.find(p=>p.name.toLowerCase()===pick.toLowerCase()||p.slug===pick);if(!proj){alert('No match for "'+pick+'"');return;}const res=await fetch('https://localhost:3000/api/sources/upload-md',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:document.title,content:'# '+document.title+'\n\nSource: '+location.href+'\n\n'+document.body.innerText.slice(0,30000),projectId:proj.id})});const j=await res.json();alert(res.ok?'\u2713 Clipped to '+proj.name+' (#'+j.sourceId+')':'\u2717 '+(j.error||res.status));}catch(e){alert('Failed: '+e.message);}})();
```

4. Save the bookmark. On any webpage, click it → pick a project (number or name) → success alert. The page lands as pending in `/sources`.

**Notes:**
- The bookmarklet uses `document.body.innerText` rather than full HTML-to-markdown conversion, so the body is plaintext. Good enough for ingestion (Claude reads it fine), but MarkDownload (Option A) produces nicer markdown for code blocks and structured pages.
- If you forgot to run with HTTPS and clicked the bookmarklet, you'll see "TLS error" or "secure connection failed" in the Web Inspector console. Restart the server with `npm run dev:https`.

### Option C — Obsidian Web Clipper

1. Install the Obsidian Web Clipper browser extension.
2. Settings → **Custom output** → add a new output with type **Web request**.
3. Use the same endpoint + body shape as Option A above.

### Triage flow

After a clip lands:

1. Go to `/sources` → the new source shows as **pending** at the top.
2. Three options on the row:
   - **Approve** — kicks off ingest, generates wiki pages.
   - **Project picker dropdown** — move to a different project (only available while pending).
   - **Delete** — remove the source and its raw file.

If you want clips to *not* auto-fire synthesis after approval, set Synthesis to **Manual** in `/settings`. Then re-run synthesis explicitly with the **Run synthesis** button on `/sources` after a triage batch.

### Limitations

- Moving a source between projects only works while it's still pending. Once ingested, the wiki pages it generated are project-scoped — workaround is delete + re-clip.
- No auth on the endpoints (matches the rest of the app — assumes localhost-only access). Don't expose this app to the public internet without adding auth.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: shadcn/ui v4 (base-nova style), Tailwind CSS v4
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **AI**: Claude CLI (`claude -p`) for all wiki operations
- **Fonts**: Inter (body), JetBrains Mono (code/numbers)
