# wikilm-mcp

MCP server that exposes your local WikiLM instance to Claude Code / Claude Desktop. Read wiki pages, search across projects, and save new notes — all scoped to the right project based on your current working directory.

**Scope (v1):** read + additive writes only. Destructive ops (move/delete/promote) are a follow-up.

## Install

```bash
cd mcp
npm install
npm run build
```

This produces `mcp/dist/index.js`, which is what Claude invokes over stdio.

## Configure

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your platform, and add:

```json
{
  "mcpServers": {
    "wikilm": {
      "command": "node",
      "args": ["/absolute/path/to/WikiLM/mcp/dist/index.js"]
    }
  }
}
```

### Claude Code

Edit `~/.claude/claude_desktop_config.json` or your project-local `.mcp.json`:

```json
{
  "wikilm": {
    "command": "node",
    "args": ["/absolute/path/to/WikiLM/mcp/dist/index.js"]
  }
}
```

Restart Claude after editing. On first launch, the server writes a sample project map at `~/.wikilm/project-map.json` if one doesn't exist.

### Environment variables

| Var                    | Default                  | Purpose                                                            |
|------------------------|--------------------------|--------------------------------------------------------------------|
| `WIKILM_API_URL`       | `http://localhost:3000`  | Override the WikiLM app URL.                                       |
| `WIKILM_PROJECT_MAP`   | `~/.wikilm/project-map.json` | Override the CWD→slug map file location.                       |
| `WIKILM_WRITE_TOKEN`   | *(unset)*                | If set, forwarded as `X-WikiLM-Write-Token` on write requests. The app side of this check is not enforced yet — this is forward-compat for the Q2 gated path. |

## Project map

Map absolute dev-project paths to WikiLM slugs, so tool calls infer the right project automatically.

`~/.wikilm/project-map.json`:

```json
{
  "//": "Map absolute dev-project paths to WikiLM project slugs",
  "/Users/you/code/codeview": "coding/codeview",
  "/Users/you/code/jenkins": "coding/jenkins"
}
```

Resolution precedence for every tool's `project` argument:

1. Explicit `project` slug in the tool call (always wins).
2. Longest-prefix match of the current working directory against the map.
3. Fallback: project id 1 (the root project).

## Tools

| Tool                    | Description                                                                                    |
|-------------------------|------------------------------------------------------------------------------------------------|
| `list_projects`         | Return the full rooted project tree (id, name, slug, parent, children).                        |
| `create_project`        | Create a new project. Pass `parent` (a slug) to nest.                                          |
| `search_wiki`           | Full-text search over title, tags, body. Returns metadata + slugs.                             |
| `read_wiki_page`        | Fetch a page by slug — frontmatter, body, backlinks.                                           |
| `list_wiki_pages`       | Metadata-only listing, optional `type` / `tag` filters.                                        |
| `get_project_synthesis` | Read the `synthesis/project-overview` page (auto-generated roll-up across all project sources).|
| `save_learning`         | Write markdown into `raw/` and create a source row. Defaults to pending; `ingest: true` starts immediate ingestion. |
| `get_job_status`        | Check a background job's status + progress by id (most recent 50 jobs).                        |

All read tools default the `project` argument via the CWD map → root fallback.

## Troubleshooting

- **`Could not reach WikiLM API at http://localhost:3000`** — start the WikiLM app (`cd app && npm run dev`) and try again.
- **`No WikiLM project found with slug "..."`** — run `list_projects` to see what's registered, or fix the mapping in `~/.wikilm/project-map.json`.
- **No project map; tool calls will need explicit `project` or fall back to root** — expected on first run. Edit `~/.wikilm/project-map.json` to add mappings for your dev projects.
- **`save_learning` always starts ingestion, even with `ingest: false`** — known v1 limitation. The MCP forwards the flag, but the current `/api/sources/upload-md` endpoint always kicks off an ingest job. Track `jobId` on the response if you need to check status.

## Development

```bash
cd mcp
npm run dev    # tsc --watch
# and, separately:
node dist/index.js
```

The server is stdio-only — running it directly blocks on stdin until the client connects. `Ctrl+C` to kill. For functional testing, invoke through Claude Code / Claude Desktop after configuring above.
