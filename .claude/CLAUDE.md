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

Lint + Fix + Gemini + UX polish shipped. 17 tickets closed this session (STO-1730 through STO-1757 minus STO-1743 and STO-1750). App renamed SecondBrain → WikiLM (Linear project + GitHub repo + app metadata). Only remaining active ticket: **STO-1743 (MCP server)** — flagged "Do NOT implement without a design session first", 6 open questions listed in the ticket. Backlog also has STO-1750 (research streaming investigation, Low).

## Known Issues

- Wiki pages are filesystem-based (not DB-backed) — search is server-side file reads
- Research results from web search depend on the chosen provider's grounding quality — URLs are sometimes approximate
- `wiki_pages` DB table exists but is not synced with filesystem wiki — API reads from disk directly
- Synthesis pending flag is in-memory only — if server restarts during a synthesis burst, follow-up is lost (next ingest re-triggers; not a data-loss issue, just a staleness window)
- Research results don't stream as found — Claude's tool-use pattern emits all `RESULT:` lines in the final text phase (STO-1750 tracks investigation)
- Ollama streaming for research/chat still unsupported — `streamClaude` emits a "not supported yet" error for `ollama:*` models
- Local directory is still `~/SecondBrain/` and DB file is still `secondbrain.db` — deferred per user preference ("leave it as long as everything else is ok")

## Known Gotchas

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
**Date:** 2026-04-18
**Who:** Claude session
**What was done:**

Major features (shipped before this session started):
- Lint feature — /lint page, lint_findings DB table, categorised findings with dismiss
- Fix feature — per-row Fix, per-category Fix all, bulk Fix selected via checkboxes
- Settings: Fix operation with its own model picker
- Rename SecondBrain → WikiLM (Linear project + GitHub repo + package.json + metadata + sidebar)

This session's tickets (all Done on main):
- STO-1730: chat wikilinks deep-link (?page= → ?slug=)
- STO-1731: synthesis auto-triggers after successful fix jobs
- STO-1732: project counts computed on-the-fly in /api/projects
- STO-1733: wiki list grouped by type when unfiltered
- STO-1734: graph force-directed layout (Fruchterman-Reingold, pure JS)
- STO-1739: wiki sections collapsed by default + expand/collapse all + localStorage persist
- STO-1740: programmatic markdown upload endpoint (POST /api/sources/upload-md) + frontmatter title on file upload
- STO-1741: export chat responses as .md or .docx (pure-JS via `docx` package)
- STO-1742: manual backup via Settings button (sqlite3 .dump + tar)
- STO-1744: pinned Project synthesis card at top of /wiki
- STO-1745: actionable knowledge gaps — Research buttons on /lint suggested_question findings + inline buttons on synthesis "Knowledge Gaps" lists
- STO-1746: Gemini CLI as third provider (gemini-runner.ts + /api/gemini/models + Settings dropdown)
- STO-1747: graceful failure framework (jobs.errorCode column + preflightProvider + formatJobError helper + classified /jobs display)
- STO-1748: research Load more pagination with excludeUrls + client dedup
- STO-1749: research pane replaced fake progress bar with honest spinner + live count
- STO-1751: research sort toggle (Relevance default, Original)
- STO-1752: backup archive now includes projects/ (not just top-level wiki/); renamed content-<ts>.tar.gz
- STO-1755: streamClaude dispatches to Gemini (was hardcoded to claude)
- STO-1756: unified Settings model pickers as three equal-width dropdowns (Claude/Ollama/Gemini)
- STO-1757: research state in localStorage + Clear all button
- Fix: Gemini model IDs corrected to gemini-3.1-pro-preview + gemini-3-flash-preview
- Chore: console.log provider dispatch in streamClaude + startJobProcess for audit

Also filed but not yet actioned:
- STO-1743: WikiLM MCP server — "Do NOT implement without a design session first", 6 open questions
- STO-1750: investigate streaming research results as found (Low priority, revisit after Gemini)

**What's next:**
- STO-1743 MCP server design session — work through the 6 open questions (project selection, auth, multi-project mapping, write confirmations, read latency, ingest feedback) before any code.
- STO-1750 streaming investigation (Low) if it becomes annoying in practice.
- User may want a follow-up on streamClaude to emit a structured errorCode for Ollama (currently emits raw text).

**Branch:** merged to main after every ticket; `chore/session-end-2026-04-18` holds these handoff updates.
**Blockers:** None
```
