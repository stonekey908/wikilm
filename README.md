# WikiLM

A local-first personal knowledge base where an LLM does the maintenance work. Drop raw material into `raw/`, the LLM reads it, writes structured interlinked markdown into `wiki/`, and keeps the graph clean as it grows. Everything stays on your machine as plain files.

Built around the pattern Andrej Karpathy described in his [LLM wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — raw sources go in, compiled knowledge comes out — extended with a full web UI, nested projects, a job queue, NotebookLM-style output generation, and an MCP server so you can talk to the wiki from any Claude Code session.

## What it does

**Wiki maintenance.** Ingest a URL, an uploaded file, or a pasted note. Claude reads it, writes a source summary, extracts entities and concepts into their own pages, and stitches everything together with `[[wikilinks]]`. A single source typically touches 5–15 pages. Updates to existing pages happen in place — knowledge compounds.

**Nested projects.** Organize multiple wikis under a single tree (e.g. `ai/llms`, `coding/codeview`). Cross-project wikilinks resolve. Parent projects get their own synthesis rolled up from children.

**Output generation (NotebookLM-style).** From any wiki page, click **Generate output** to produce a polished artifact in one of five formats:

| Type | Primary | Companion | Use case |
|------|---------|-----------|----------|
| Report | `.md` | `.docx` | Long-form, citations, export to Word |
| Executive summary | `.md` | `.docx` | 1-page brief for stakeholders |
| Cheat sheet | `.md` | `.docx` | Scannable reference card |
| Deck | `.md` | `.pdf` + `.pptx` | Marp-rendered slides |
| Infographic | `.html` | `.png` | Single-page visual, inline SVG |

Outputs can be scoped to the current page or the whole subtree, optionally nudged with a custom instruction (audience, tone, focus), and appear in the wiki list so you can link them like any other page. The model that generated each artifact is written into its frontmatter so you can review provenance later.

**MCP server.** A built-in [Model Context Protocol](https://modelcontextprotocol.io) server lets any Claude Code session read and write the wiki based on your current working directory. Nine tools: list projects, search, read, list pages, get synthesis, save a learning, generate an output, check job status, create a project. See `mcp/README.md` for configuration.

**Local-first.** All data is plain markdown files on disk. SQLite for job state, jobs queue, sources index. No cloud, no embeddings DB, no vendor lock-in — open the folder in Obsidian any time.

## Screenshots

### Wiki with generated outputs
Outputs appear inline with source/entity/concept pages, filterable by type.

![Wiki view with output pages](docs/screenshots/01-wiki-with-outputs.png)

### Generate output modal
Pick a type, choose scope (this page or the whole subtree), optionally nudge the prompt, run in the background.

![Generate output modal](docs/screenshots/02-generate-modal.png)

### Jobs page
Every Claude subprocess — ingest, synthesis, lint, research, output — shows up here with type icon, status, model, and a cancel button.

![Jobs page showing model badges](docs/screenshots/03-jobs-page.png)

### Sources
Ingested material with humanized subtitles (domain, summary, or type label — never raw JSON).

![Sources page](docs/screenshots/04-sources.png)

### In-app help
Press `?` anywhere, or click **Help** in the sidebar footer, for a walkthrough of the idea, the flow, and what each page does.

![Help modal](docs/screenshots/05-help-modal.png)

## Example output

The infographic below was generated end-to-end from the `ai/llms` project — a single `Generate output` click produced the prompt, fed it to Claude with wiki context, wrote the HTML, and rendered the PNG via headless Chrome. No hand-tuning.

![Example infographic](projects/ai/llms/wiki/outputs/2026-04-19-infographic.png)

## Setup

See [SETUP.md](SETUP.md) for the full walkthrough. Quick version:

```bash
cd app
cp .env.example .env.local        # mock mode by default — no API key needed to explore
npm install
npm run db:push                   # create the SQLite database
npm run dev                       # http://localhost:3000
```

To use real Claude rather than mock data, install the Claude CLI and flip `MOCK_MODE=false`. Optional: Ollama for local models, Gemini CLI for Gemini models — both dispatched by prefix in the model picker.

For PDF/PPTX deck rendering and infographic PNG rendering, the post-job hooks use Marp CLI and system Chrome respectively. Both are optional — the primary markdown or HTML artifact always lands, and companion formats fail gracefully.

## MCP (use from any Claude Code session)

Register once globally:

```bash
cd mcp
npm install
npm run build
claude mcp add --scope user wikilm node $(pwd)/dist/index.js
```

Now in any Claude Code session, anywhere on disk, Claude can list your projects, search across all wikis, read a page, save a learning, or generate an output — scoped automatically to the project whose filesystem path matches your cwd.

Full tool list and configuration: [mcp/README.md](mcp/README.md).

## Layout

```
SecondBrain/
  raw/                     # Source material — never modified by the LLM
  wiki/                    # Top-level wiki (LLM-owned)
  projects/<slug>/
    raw/
    wiki/                  # Project-scoped wiki
      outputs/             # Generated reports, decks, infographics…
  app/                     # Next.js 16 app (UI + API + job queue)
  mcp/                     # MCP server (stdio, @modelcontextprotocol/sdk)
  docs/                    # Screenshots + design notes
```

## Credits

The core pattern — raw sources in, LLM-maintained markdown wiki out, everything as plain files — comes from [Andrej Karpathy's LLM wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and his [X/Twitter post](https://x.com/karpathy) describing the workflow. This project extends that pattern with a UI, nested projects, output generation, and MCP integration, but the shape of the idea is his.

## License

Personal project. No license granted for external use without permission.
