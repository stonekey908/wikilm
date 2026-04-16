# SecondBrain — LLM Wiki Schema

You are maintaining a personal knowledge base (wiki) for the user. This wiki follows the Karpathy LLM Wiki pattern: raw sources go in, structured interlinked markdown comes out.

## Architecture

```
SecondBrain/
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

Wiki UX + smart chat + multi-provider shipped. All 7 Linear tickets complete and merged to main. App now has: auto-updating synthesis, smart chat routing (reads index + synthesis first), breadcrumbs + related pages, TOC, quick URL input, Ollama provider support, SVG graph visualization. Next phase is open — no active tickets.

## Known Issues

- Wiki pages are filesystem-based (not DB-backed) — search is server-side file reads
- Research results from web search depend on Claude's web grounding quality — URLs are sometimes approximate
- `wiki_pages` DB table exists but is not synced with filesystem wiki — API reads from disk directly
- Synthesis pending flag is in-memory only — if server restarts during a synthesis burst, follow-up is lost (next ingest re-triggers; not a data-loss issue, just a staleness window)

## Known Gotchas

- **`claude -p` asks for write permissions** → spawned without `--allowedTools` → fix: pass `--allowedTools "Write" "Edit" "Read" "WebSearch" "WebFetch"` in spawn args
- **Hot-reload doesn't pick up claude-runner.ts changes** → module cached by Next.js → fix: restart dev server after changing claude-runner.ts
- **Jobs beyond MAX_CONCURRENT (3) silently failed** → `startJob` threw error caught by caller → fix: implemented job queue with auto-drain
- **Rapid ingest bursts would queue N synthesis jobs** → each onComplete fires trigger independently → fix: coalescing flags in claude-runner.ts (synthesisInFlight + synthesisPending) collapse to at most 2 runs per burst
- **Model setting value format** → bare aliases ("sonnet") = Claude; "ollama:<model>" prefix = Ollama HTTP path. `startJobProcess` dispatches based on prefix.

## Last Session

```
**Date:** 2026-04-16
**Who:** Claude session
**What was done:**
- STO-1726: auto-updating synthesis page (triggers after each ingest, 500-word cap)
- STO-1728: smart chat routing — wraps chat prompt to read index.md + synthesis first, then only relevant pages (NotebookLM-style hierarchical retrieval)
- STO-1723: quick add URL input in sources library (paste URL, creates web source, starts ingest)
- STO-1722: breadcrumb trail in detail pane + related pages panel (forward wikilinks + backlinks) in list pane
- STO-1724: collapsible table of contents for wiki pages with 3+ headings, IntersectionObserver for active section
- STO-1729: Ollama provider support — detectOllamaModels() + runOllamaJob(); Settings UI shows per-operation Claude/Ollama picker; AbortController-based cancel
- STO-1725: SVG graph visualization — deterministic circular layout grouped by type, pan/zoom/hover-highlight, click to navigate
- Coalescing fix: synthesisInFlight + synthesisPending flags prevent N redundant synthesis runs during rapid ingest bursts (follow-up guarantees final state is captured)
**What's next:**
- No active tickets — backlog open
- Possible future work: Ollama streaming for chat (sub-ticket), force-directed graph upgrade, DB-backed wiki_pages sync, synthesis requeue-on-restart
**Branch:** merged to main
**Blockers:** None
```
