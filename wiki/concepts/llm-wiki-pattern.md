---
type: concept
tags: [knowledge-management, llm, architecture, second-brain]
---

# LLM Wiki Pattern

A system where an LLM acts as a full-time librarian over a personal knowledge base, reading raw sources and "[[knowledge-compilation|compiling]]" them into a structured, interlinked wiki of markdown files. Originated by [[andrej-karpathy]] in April 2026.

## How It Works

### Architecture (Three Layers)

1. **Raw sources** (`raw/`) — articles, papers, images, data files. Read-only. The human curates what goes in; the LLM never modifies it.
2. **Schema** (e.g., `CLAUDE.md`) — instructions telling the LLM how to structure the wiki: page formats, naming conventions, operations. An "employee handbook" for the AI.
3. **Wiki** (`wiki/`) — the LLM-maintained output. Structured markdown files with YAML frontmatter, `[[wikilinks]]`, and Git version tracking. Page types include entity pages, concept pages, source summaries, comparisons, synthesis, and query pages.

### Operations

- **Ingest**: Drop new material into `raw/`. The LLM reads it and incrementally updates 10-15 wiki pages — new pages, updated entities, backlinks, refreshed summaries.
- **Query**: The LLM searches the wiki's index, reads relevant pages, and synthesizes answers. Good answers get "filed" back as query pages.
- **Lint**: Periodic maintenance scan for contradictions, orphans, gaps, and stale claims. The LLM fixes what it can and flags the rest.

### Output Layer

The LLM generates outputs as files (not just chat responses): markdown pages, Marp slides, matplotlib charts, comparison tables. Outputs feed back into the wiki, so every interaction makes the knowledge base richer.

## Why Not RAG?

Contrasted with [[retrieval-augmented-generation]]:

| | RAG | LLM Wiki |
|---|---|---|
| Knowledge state | Rediscovered from scratch each query | Compiled once, incrementally updated |
| Structure | Chunks in a vector database | Organized, interlinked markdown pages |
| Accumulation | Nothing compounds | Every ingest and query enriches the wiki |
| Cross-source connections | Must find and stitch fragments each time | Pre-built through backlinks and entity pages |
| Transparency | Black box (embeddings) | Plain markdown you can read and edit |
| Infrastructure | Vector database, embeddings pipeline | Just markdown files and an LLM |

## Scale

Karpathy's wiki on a single topic: ~100 articles, 400,000 words. Navigated using just its own index and summaries — no vector database, no embeddings, no similarity search.

## Domain Agnosticism

The system is domain-agnostic because the schema layer absorbs all domain-specific configuration. Change the schema, compile a different kind of wiki. Use cases mentioned: competitive analysis, due diligence, trip planning, novel tracking, exam studying, technical learning.

## Limitations

The LLM excels at **reconnaissance** (mapping, organizing, connecting) but **synthesis** (forming original ideas) remains human work. See [[zettelkasten]] for the historical parallel — writing in your own words is how understanding happens.

## Future Direction

A well-maintained wiki could be used to generate synthetic training data to fine-tune a smaller LLM, moving from "knowledge base the AI reads" to "specialized model that has internalized the domain."

## Sources

- [[karpathy-second-brain-medium-article]]
