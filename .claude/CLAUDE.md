# WikiLM — LLM Wiki Schema

You are maintaining a personal knowledge base (wiki) for the user. This wiki follows the Karpathy LLM Wiki pattern: raw sources go in, structured interlinked markdown comes out.

## Architecture

```
WikiLM/
  raw/          # Source material — NEVER modify. Read-only for the LLM.
  wiki/         # LLM-maintained markdown files. The LLM owns this layer entirely.
    index.md    # Master catalog of all wiki pages, organized by category
    log.md      # Chronological record of all operations (ingest, query, lint)
```

## Core Rules

1. **Never modify files in `raw/`** — this is the source of truth. Read from it, never write to it.
2. **The LLM owns `wiki/`** — create, update, and maintain all wiki pages. The user reads; you write.
3. **Everything is markdown** — plain `.md` files with YAML frontmatter. No databases, no embeddings, no vector stores.
4. **Knowledge compounds** — every ingest, every query answer worth keeping, every connection discovered gets filed into the wiki.
5. **Always update `index.md` and `log.md`** after any operation.

## Page Types

### Source Summaries
One per raw source. Filename: `wiki/sources/{slugified-source-title}.md`
```yaml
---
type: source
title: "Original title"
author: "Author name"
date: "YYYY-MM-DD"
source_file: "raw/filename.ext"
tags: [topic1, topic2]
---
```
Contains: key takeaways, important claims, notable quotes, relevance to other wiki pages. Link to related entity/concept pages with `[[wikilinks]]`.

### Entity Pages
People, organizations, products, projects. Filename: `wiki/entities/{entity-name}.md`
```yaml
---
type: entity
entity_type: person | organization | product | project
tags: [topic1, topic2]
---
```
Contains: who/what they are, key facts, what sources mention them, how they connect to other entities and concepts.

### Concept Pages
Ideas, methods, theories, frameworks, patterns. Filename: `wiki/concepts/{concept-name}.md`
```yaml
---
type: concept
tags: [topic1, topic2]
---
```
Contains: explanation, how different sources treat this concept, connections to other concepts, practical implications.

### Comparison Pages
Side-by-side analysis of competing ideas, tools, or approaches. Filename: `wiki/comparisons/{comparison-name}.md`
```yaml
---
type: comparison
items: ["Item A", "Item B"]
tags: [topic1, topic2]
---
```

### Synthesis Pages
Overviews that tie multiple sources together around a theme. Filename: `wiki/synthesis/{theme-name}.md`
```yaml
---
type: synthesis
sources: ["source1.md", "source2.md"]
tags: [topic1, topic2]
---
```

### Query Pages
Answers to questions that are worth preserving. Filename: `wiki/queries/{slugified-question}.md`
```yaml
---
type: query
question: "The original question"
date: "YYYY-MM-DD"
tags: [topic1, topic2]
---
```

## Operations

### Ingest
When the user adds new material to `raw/` and asks you to process it:

1. Read the source material completely
2. Discuss key takeaways with the user (unless they say to just process it)
3. Create a source summary page in `wiki/sources/`
4. Identify entities — create new entity pages or update existing ones
5. Identify concepts — create new concept pages or update existing ones
6. Look for connections, contradictions, or reinforcements with existing wiki content
7. Add `[[wikilinks]]` throughout — both in the new pages and in existing pages that should now link to the new content
8. Update `wiki/index.md` with new pages
9. Append to `wiki/log.md`

A single source typically touches 5-15 wiki pages. Be thorough.

### Query
When the user asks a question against the wiki:

1. Read `wiki/index.md` to find relevant pages
2. Read the relevant wiki pages
3. Synthesize an answer with citations to specific wiki pages
4. If the answer is substantial or represents a new insight, offer to file it as a query page in `wiki/queries/`
5. If the answer reveals gaps, suggest sources to look for

### Lint
When the user asks for a health check (or periodically suggest it):

1. Scan for orphan pages (no inbound links from other pages)
2. Check for contradictions between pages
3. Find concepts mentioned frequently but lacking their own page
4. Identify stale claims that newer sources may have superseded
5. Check for missing cross-references
6. Suggest new questions to investigate or sources to find
7. Report findings and fix what you can, flag what needs user input
8. Log the lint pass in `wiki/log.md`

## Wikilinks

Use `[[page-name]]` syntax for internal links (Obsidian-compatible). When referencing another wiki page, always link it. This builds the graph of connections that makes the wiki valuable.

## Index Structure

`wiki/index.md` is organized by category:
```markdown
# Wiki Index

## Sources
- [[source-page]] — one-line summary

## Entities
- [[entity-page]] — one-line summary

## Concepts
- [[concept-page]] — one-line summary

## Comparisons
- [[comparison-page]] — one-line summary

## Synthesis
- [[synthesis-page]] — one-line summary

## Queries
- [[query-page]] — one-line summary
```

## Log Format

Each entry in `wiki/log.md` starts with a consistent prefix for parseability:
```markdown
## [YYYY-MM-DD] operation | Title
Details of what was done.
```

Operations: `ingest`, `query`, `lint`, `update`

## Multi-Topic Support

This is a general-purpose knowledge base. Topics are handled via tags in frontmatter rather than rigid folder hierarchies. The index and tag system allow any topic to coexist. When topics grow large enough, suggest creating a synthesis page that ties together everything the wiki knows about that topic.

## Quality Standards

- Every wiki page must have YAML frontmatter with at least `type` and `tags`
- Every page must link to at least one other page (no orphans)
- Source summaries must cite the specific raw file they summarize
- Claims should be traceable back to a source
- When sources contradict each other, note the contradiction explicitly rather than silently picking a side

## Current Phase

**Nesting + MCP shipped.** STO-1758 (parent/child project nesting) + 8 follow-ups closed across 2 days. WikiLM now supports nested projects end-to-end — ingest, synthesis, lint, parent synthesis, parent lint, dashboard nudges, move, cross-project wikilinks, tree sidebar, breadcrumbs, graph subtree view. STO-1743 MCP server v1 shipped at `mcp/` and registered globally in Claude Code. Knowledge base now usable from any Claude Code session at any level of the project tree.

Outstanding: STO-1766 (NotebookLM-style output generation, High — new, next session's big item) and STO-1767 (MCP v2 destructive ops, Low).

## Known Issues

- Wiki pages are filesystem-based (not DB-backed) — search is server-side file reads
- Research results from web search depend on the chosen provider's grounding quality — URLs are sometimes approximate
- `wiki_pages` DB table exists but is not synced with filesystem wiki — API reads from disk directly
- Synthesis pending flag is in-memory only — if server restarts during a synthesis burst, follow-up is lost (next ingest re-triggers; not a data-loss issue, just a staleness window)
- Research results don't stream as found — Claude's tool-use pattern emits all `RESULT:` lines in the final text phase (investigation ticket STO-1750 cancelled)
- Ollama streaming for research/chat still unsupported — `streamClaude` emits a "not supported yet" error for `ollama:*` models
- Local directory is still `~/SecondBrain/` and DB file is still `secondbrain.db` — deferred per user preference ("leave it as long as everything else is ok")
- Ingest prompt can reference entities without creating pages → dangling wikilinks (tightened in STO-1765 but not zero-risk — "wikilink discipline" rule is soft guidance, not enforced by code)
- MCP v1 omits destructive ops (move/delete/promote) — tracked as STO-1767

## Known Gotchas

- **Nested-project subprocesses write to wrong wiki** → Claude walks up to repo-root `.claude/CLAUDE.md` which describes flat layout → fix: `createProjectDirectories` scaffolds a per-project `.claude/CLAUDE.md` (STO-1763). Backfill via `POST /api/admin/backfill-claude-md` if you find an old project without one.
- **Spawn cwd must be `projectRoot(project)`, not repo root** → Claude's relative path resolution picks up the wrong wiki → fix: every subprocess endpoint passes `projectRoot(project)` as the spawn cwd. Full list of endpoints now aligned: ingest-web, lint/run, lint/fix, lint/findings/[id]/fix, sources/research, sources/upload, sources/upload-md, sources/[id], claude/stream, claude/job, projects/[id]/synthesis/parent-run, lint/parent-run.
- **`upload-md` used to always ingest** → STO-1743's "save as pending" contract required `ingest=false` default → fix: endpoint now defaults to pending status, only spawns Claude if `ingest: true` in body.
- **`upload-md` raw file landed in top-level `raw/`** → even when projectId pointed to a nested project → fix: use `path.join(projectRoot(project), "raw")` instead of `path.join(process.cwd(), "..", "raw")`.
- **Next.js 16 prerender fails on `useSearchParams()` without Suspense** → 5+ minute debugging loop if you don't know → fix: wrap the hook-using component in `<Suspense fallback={null}>` at the page export level (see `/wiki` and `/sources` pages).
- **`persistLintFindings` clears existing findings for (projectId, scope) before inserting** → if a parent lint subprocess runs and produces 0 findings, seeded demo findings get wiped → fix: be aware, or add a "don't clear if incoming is empty" guard if it bites again.
- **Claude Code hook blocking subprocess writes on main** → a PreToolUse hook gated on `git branch` caught every subprocess Claude, not just interactive ones → fix: removed the hook (was in `~/.claude/settings.json`). If reinstated, scope it to code paths, exclude `wiki/` + `projects/*/wiki/`.
- **`claude -p` asks for write permissions** → spawned without `--allowedTools` → fix: pass `--allowedTools "Write" "Edit" "Read" "WebSearch" "WebFetch"` in spawn args
- **Hot-reload doesn't pick up claude-runner.ts changes** → module cached by Next.js → fix: restart dev server after changing claude-runner.ts
- **Jobs beyond MAX_CONCURRENT (3) silently failed** → `startJob` threw error caught by caller → fix: implemented job queue with auto-drain
- **Rapid ingest bursts would queue N synthesis jobs** → each onComplete fires trigger independently → fix: coalescing flags in claude-runner.ts (synthesisInFlight + synthesisPending) collapse to at most 2 runs per burst
- **Model setting value format** → bare aliases ("sonnet") = Claude; "ollama:<model>" prefix = Ollama HTTP; "gemini:<model>" prefix = Gemini CLI. `startJobProcess` + `streamClaude` both dispatch based on prefix.
- **Gemini model IDs must be preview endpoints** → `gemini-3-flash`/`gemini-3-pro` 404 against the live API → fix: use `gemini-3-flash-preview` and `gemini-3.1-pro-preview`
- **Gemini CLI needs `-y` (yolo) flag** → without it the CLI prompts for tool approval and hangs since we have no stdin → fix: always pass `-y -o text` in spawn args
- **streamClaude was hardcoded to claude** → picking Gemini for research did nothing silently → fix: `streamClaude` now branches on model prefix and emits structured errors when the stream provider isn't supported (Ollama)
- **Research results cleared on tab close** → sessionStorage is per-tab → fix: migrated `sb_research_query` + `sb_research_results` to localStorage
- **Backup only grabbed top-level wiki/** → `projects/<slug>/wiki/` was silently excluded → fix: tar now includes both `wiki/` and `projects/`; archive renamed `content-<ts>.tar.gz`
- **`gh repo rename` updates both GitHub and the local remote** → so after renaming you don't need a separate `git remote set-url`

## Last Session

```
**Date:** 2026-04-18 → 2026-04-19 (multi-day)
**Who:** Claude session
**What was done:**

Design + ship + UAT + polish on parent/child nesting, then MCP v1:

STO-1758 — WikiLM parent/child project nesting (Done)
- 8 vertical slices: foundation → nav → cross-project links → move → children section → graph scope → parent synthesis/lint → dashboard nudges
- Materialized-path slugs (e.g. `coding/codeview`), filesystem mirrors slug
- New src/lib/projects.ts service; tree sidebar with collapse/persist; breadcrumbs on 5 pages
- Cross-project wikilinks `[[other-project/page]]` resolve; backlinks walk all projects
- Move project action with filesystem rename + wikilink rewrite + cycle/collision guards
- Parent synthesis + parent lint (promotion_candidate / recurring_theme / parent_gap finding types); lint_findings.scope column; Settings auto-sync toggle
- Dashboard Nudges section with Promote / Create concept / Research / Dismiss actions; sidebar pending-nudge badges

STO-1758 UAT follow-ups (Done)
- STO-1759: Suspense wrappers on /wiki and /sources so npm run build passes
- STO-1760: /sources and /jobs scoped to active project via ?projectId=
- STO-1761: distinct color palette for graph subtree mode
- STO-1762: "Add child…" shortcut in ProjectSwitcher ⋯ menu
- STO-1763: Per-project .claude/CLAUDE.md scaffold — cured the "subprocesses write to top-level wiki" bug. Backfill endpoint at /api/admin/backfill-claude-md.

STO-1743 — WikiLM MCP server v1 (Done)
- New mcp/ package at repo root: Node + TypeScript + @modelcontextprotocol/sdk
- 8 tools: list_projects, create_project, search_wiki, read_wiki_page, list_wiki_pages, get_project_synthesis, save_learning, get_job_status
- All tested end-to-end via JSON-RPC: nesting works, pending-by-default save works, CWD → slug resolution via ~/.wikilm/project-map.json works
- Registered globally in Claude Code: `claude mcp add --scope user wikilm node <repo>/mcp/dist/index.js`. Shows as ✓ Connected in `claude mcp list`.
- Project map pre-populated with <user-home>/codeview → coding/codeview and <user-home>/SecondBrain → ai/llms

STO-1764 — DRY cleanup (Done)
- Hoisted getAllMdFiles + parseFrontmatter to src/lib/wiki-utils.ts. −60 lines, fixed a drifted tags-parse bug in the graph route.

STO-1765 — Wiki quality (Done)
- Ingest prompt enforces wikilink discipline (every [[x]] must resolve) + lists existing parent/sibling entity pages to prefer cross-project links over duplicates.

Plus 8 audit-discovered projectCwd fixes across lint/fix, upload, research, claude/stream, claude/job, sources/[id] endpoints — every Claude subprocess now spawns in the right project dir.

Wiki content produced + committed this session:
- AI (id=9) + AI/LLMs (id=10) projects with real research-sourced pages (~60 wiki .md files)
- Coding (id=4) + Coding/Codeview (id=5) scaffolds

Tickets filed but not touched:
- STO-1766: Output generation — reports/slides/infographics (NotebookLM-style). High priority. Next session's big item.
- STO-1767: MCP v2 destructive ops (move/delete/promote preview-confirm pairs). Low.

**What's next:**
- STO-1766 output generation is the top new item. Fresh session recommended — design a "Generate output" panel with 5 types (report/deck/infographic/cheat/summary), scope toggle, nudge input, endpoint wiring + prompt templates per type.
- Verify MCP from a fresh Claude Code session: restart, open any dev project, try `list_projects` + `save_learning`.
- Optional polish: STO-1767 MCP destructive ops if needed, STO-1765 v2 (auto-create-page for every wikilinked entity).

**Branch:** main (clean, pushed to origin at 2b77ad1 before CLAUDE.md update).
**Blockers:** None.
```
