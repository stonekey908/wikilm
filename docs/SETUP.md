# Running wikiLM locally

A practical guide to getting the app running and wiring up API keys, Obsidian,
Notion, and MCP. Everything below assumes you cloned the repo and are in its
root.

## 1. Run the app

```bash
cd app
npm install
npm run db:push      # creates ../secondbrain.db (the schema) on first run
npm run dev          # http://localhost:3000
```

- The SQLite database lives at the repo root: `secondbrain.db`.
- On first launch, create a project from the sidebar project switcher. The
  **first project becomes id 1 and maps to the repo-root `wiki/` folder**;
  later projects live under `projects/<slug>/wiki/`.
- The brutalist **Editorial** layout is the default. Toggle to the
  Perplexity-style **Aurora** layout with the `Editorial ⇄ Aurora` switch
  (top-right), or in Settings.

### Claude / models

wikiLM drives Claude through the **Claude Code CLI**, so install and sign in to
it first (`claude`). Two ways to authenticate model calls:

- **Subscription (default):** just be logged into the `claude` CLI.
- **Bring your own API key:** Aurora → **Connections → Claude API** → paste your
  `sk-ant-…` key and pick a model → **Test**. The key is stored server-side
  (redacted from the API), injected into the CLI as `ANTHROPIC_API_KEY`, and the
  chosen model becomes the default for answer/chat/synthesis/ingest/lint runs.

## 2. Connections (where all the keys live)

Everything is configured in **Aurora → Connections**. Keys are stored in the
local DB and **never returned in full** by the API (they're redacted/masked).

| Integration | What to enter | Effect |
|---|---|---|
| **Claude API** | Anthropic key + model | Runs bill against your key |
| **MCP connectivity** | toggle on/off | Master switch; gates Tavily |
| **Tavily** | `tvly-…` key (needs MCP on) | Research uses Tavily web search |
| **Notion** | integration token + parent page id + direction | Wiki ⇄ Notion sync |
| **Obsidian** | vault path | Export wiki as a linked-Markdown vault |

## 3. Tavily (web search for research)

1. Get a key from tavily.com.
2. Connections → turn **MCP connectivity** on (Tavily is gated on it).
3. Paste the key into the **Tavily** card → **Test**.

Now **Sources → Research** (and Discover) route through Tavily instead of the
Claude CLI's built-in web search.

## 4. Obsidian (Obsidian draws the graph)

The wiki is already linked Markdown (`[[wikilinks]]` + frontmatter), so export
just mirrors it into a vault.

1. Connections → **Obsidian** → set **Vault path** to an absolute folder on the
   machine running the app, e.g. `/Users/you/Obsidian/AI Research`.
2. Click **Export now**. Pages are written preserving their folder structure;
   re-exports are incremental (only changed files are rewritten).
3. Open that folder as a vault in Obsidian — its graph view reflects the wiki's
   links. (This replaces the old in-app graph.)

## 5. Notion sync (how it works)

wikiLM syncs a project to a **parent Notion page** using the Notion API.

**One-time setup**

1. Create an internal integration at <https://www.notion.so/my-integrations> and
   copy its **Internal Integration Secret** (`secret_…` / `ntn_…`).
2. In Notion, open (or create) the page you want the wiki to live under. Use the
   page's `•••` menu → **Connections → Add connections** → select your
   integration (this grants it access).
3. Copy the **parent page id**: it's the 32-character hex string at the end of
   the page URL (`notion.so/Title-<THIS_PART>`).

**In wikiLM**

4. Connections → **Notion** → paste the **token** and **parent page id**, choose
   a **Direction**, then **Test** and **Sync now**.

**What the sync does** (trigger is the **Sync now** button — no background sync)

- **Dedicated area, auto-created:** on the first sync wikiLM creates a **`wikiLM`
  hub page** under your parent, and a **`<project name>` page** under that. You
  only ever share/paste the one parent page; wikiLM owns the structure beneath it.
- **Push (wiki → Notion):** each wiki page becomes a child of the project page.
  Markdown → Notion blocks (headings, bullets, quotes, paragraphs). A
  `projectId:slug → page-id` map is kept, so re-syncs:
  - **Add** new wiki pages → new Notion pages,
  - **Update** changed pages (title + full content refresh, no duplicates),
  - **Delete** — if a wiki page is gone, its Notion page is **archived**.
- **Delete policy = wiki is source of truth:** deletions only flow wiki → Notion.
  Deleting a page **in Notion does NOT remove it from the wiki** (it's restored on
  the next push), so an accidental Notion delete can't destroy your wiki.
- **Pull (Notion → wiki)** *(direction = pull / two-way)*: Notion edits are
  converted back to Markdown and written into the wiki, **preserving frontmatter**.
- **Two-way:** pulls pages edited in Notion since the last sync, then pushes.

> The parent page must be shared with your integration (page `•••` → Connections),
> or Notion returns 401/403. Wikilinks are kept as literal `[[text]]` in Notion.

## 6. MCP — drive wikiLM from Claude

The `mcp/` package is an MCP server that proxies to the app's HTTP API.

```bash
cd mcp
npm install
npm run build        # produces dist/index.js
```

**Local (Claude Desktop / Claude Code), stdio:** add to your MCP config
(`.mcp.json` or the Claude config):

```json
{
  "mcpServers": {
    "wikilm": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/wikilm/mcp/dist/index.js"],
      "env": { "WIKILM_API_URL": "http://localhost:3000" }
    }
  }
}
```

The app must be running. Tools include: list/search/read wiki pages, list
sources, preview/approve a source, dispatch research, create a project, save a
note, generate outputs, export to Obsidian, and check job status.

**Remote (Claude web / mobile), Streamable HTTP:** start the server with a port
and point a hosted MCP client at it:

```bash
MCP_HTTP_PORT=8787 WIKILM_API_URL=https://your-host node mcp/dist/index.js
```

**Write protection (optional):** set the same `WIKILM_WRITE_TOKEN` on both the
app (`WIKILM_WRITE_TOKEN=… npm run dev`) and the MCP server's `env`. With it set,
all write endpoints require the token; unset, the app behaves normally.

**wikiLM as an MCP *client*:** Connections → MCP card → "External MCP servers"
lets you register another MCP server (e.g. `npx -y @notionhq/notion-mcp-server`)
and **Check** it to list its tools — wikiLM connecting *out* over MCP.
