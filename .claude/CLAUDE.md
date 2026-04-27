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

---

## Current Phase

**Web clipper + per-project synthesis tooling shipped.** WikiLM is a daily-use research tool: bookmarklet captures any HTTPS webpage as real markdown without web grounding; pending sources triage on `/sources` (Preview / Approve / Move / Delete); manual synthesis mode keeps token spend in check during batch ingest.

## Known Issues

- **Pre-existing lint errors elsewhere.** ~33 lint warnings + 15 errors carry from before this session (notably `react-hooks/set-state-in-effect` violations in `src/app/wiki/page.tsx:123`, `src/components/theme-provider.tsx:21`, etc.). None blocking. No new ones introduced by this session.
- **Site-CSP `script-src` blocks the bookmarklet** on enforcing sites (Wikipedia is report-only so it works). For those sites use MarkDownload (Chrome extension). Documented in SETUP.md.
- **No tests for `/api/clip` route** — thin shim around `lib/clip-to-markdown` (already covered by 6 vitest cases) + filesystem write. Visual UAT only.

## Last Session

**Date:** 2026-04-27
**Who:** Claude session
**What was done:**
- STO-1952 — global manual synthesis mode (auto/manual toggle in Settings, Run synthesis button on `/sources`, gates `triggerSynthesisUpdate` via `shouldRunSynthesis` helper, 4 unit tests). Merged.
- STO-1953 — web clipper foundations: `defer: true` flag on `/api/sources/ingest-web`, new `/api/sources/[id]/move` (pending-only) endpoint, `/sources` project picker dropdown, `lib/cors.ts` (CORS preflight + headers on clipper endpoints), `npm run dev:https` script, SETUP.md Web Clipper section. Merged.
- STO-1959 — preview pending source: `lib/clip-to-markdown.ts` (Turndown wrapper, 6 tests), `/api/sources/[id]/raw` GET endpoint, `SourcePreviewModal` component, `upload-md` accepts `html` OR `content`. README clipper bullet added. Merged.
- STO-1960 — Safari-proof clipper: `app/public/clip.js` hosted form-builder, `/api/clip` route handler, rewrote `/clip` page in editorial layout, ~140-char script-injection bookmarklet. Five failed rounds documented in Linear closing comment. Merged.
- Filed STO-1954 (Mac app packaging — Tauri sidecar, Large, deferred) and STO-1958/STO-1959 follow-ups during the journey.

**What's next:**
- STO-1954 (Mac app packaging) is the next big ticket. Pre-flagged Large; recommend splitting at sprint pickup into 3a (Tauri shell) / 3b (data dir + CLI detection) / 3c (signing + .dmg).
- README clipper bullet wording is async — user wanted to spot-check on GitHub. File a follow-up if rewording is needed.
- Optional: a real Safari/Chrome browser extension (Phase B from STO-1953) — bypasses CSP-enforcing sites that block the bookmarklet's script injection.

**Branch:** `main` (all session work merged + branches cleaned)
**Blockers:** None

## Known Gotchas

- **Safari mangles bookmarklet JS > ~140 chars** → URL field injects whitespace mid-identifier on save (random spots each paste — `Number.isFinite`, `'POST'`, `'application/json'`, `outerHTML` all hit) → use the script-injection pattern: tiny bookmarklet loads a hosted JS file from localhost. See `app/public/clip.js` for the canonical example.
- **HTTPS pages can't fetch HTTP localhost** → mixed-content block (Safari especially) → run dev server with `npm run dev:https` and trust the self-signed cert once.
- **Local main may lose upstream tracking after a fresh checkout** → `git push` errors with "no upstream branch" → `git branch --set-upstream-to=origin/main main` (one-time fix per checkout). Or use `git push origin main` explicitly.
- **Next.js 16 dev server doesn't always hot-reload new route handlers** → 404s on freshly-added routes → restart with Ctrl-C + `npm run dev:https`.

