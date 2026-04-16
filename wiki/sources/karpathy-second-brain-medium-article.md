---
type: source
title: "Andrej Karpathy Stopped Using AI to Write Code. He's Using It to Build a Second Brain Instead"
author: "Nikhil (Neural Notions)"
date: "2026-04-05"
source_file: "raw/Andrej_Karpathy_Stopped_Using_AI_to_Write_Code._He_s_Using_It_to_Build_a_Second_Brain_Instead___by_Nikhil___Neural_Notions___Apr__2026___Medium.pdf"
tags: [llm-wiki, knowledge-management, andrej-karpathy, second-brain, rag, obsidian]
---

# Karpathy Stopped Using AI to Write Code — He's Using It to Build a Second Brain Instead

Medium article by Nikhil (Neural Notions), published April 5, 2026. Breaks down [[andrej-karpathy]]'s public shift from using AI for code generation to using it for knowledge organization, and provides a practical guide for building the system yourself.

## Key Takeaways

1. **The shift**: On April 3, 2026, Karpathy posted on X that he spends less time using AI to generate code and more time using it to organize knowledge. He described an actual working system — not a theoretical framework.

2. **The system**: Raw research materials go into a folder. An LLM reads them and builds/maintains a structured, interlinked wiki of markdown files. No human editing of the wiki. The AI writes articles, creates backlinks, categorizes concepts, and keeps everything updated as new material arrives.

3. **Scale**: His research wiki on a single topic grew to ~100 articles and 400,000 words. He rarely touches it directly.

4. **The "idea file"**: The next day, Karpathy shared a GitHub gist laying out the full architecture, designed to be pasted into an LLM agent so it builds the system for you. His reasoning: *"In this era of LLM agents, there is less of a point/need of sharing the specific code/app, you just share the idea, then the other person's agent customizes & builds it for your specific needs."*

## The Problem with RAG

The article contrasts this approach with [[retrieval-augmented-generation]]:

- RAG chops documents into chunks, converts them to embeddings, and searches for similar chunks at query time
- **Fundamental limitation**: the AI rediscovers knowledge from scratch every time. Nothing accumulates. No memory, no structure, no map of how ideas relate.
- Karpathy's approach: the LLM reads raw material once and **compiles** it into structured, organized wiki pages. At query time, it reads the already-organized wiki — no vector search needed.

As VentureBeat noted: the LLM isn't acting as a search engine. It's acting as a research librarian who actively authors and maintains a persistent record.

## Architecture: Three Layers

### Layer 1: Raw Sources
A `raw/` folder containing articles, research papers, images, data files, code repos. **Read-only** — the LLM never writes to it. Source of truth.

Karpathy uses the Obsidian Web Clipper browser extension to capture web articles as markdown. Also downloads related images locally to avoid broken URLs.

### Layer 2: The Schema (Instructions for the LLM)
A configuration file (`CLAUDE.md` for Claude Code, `AGENTS.md` for other tools) that tells the LLM how to structure the wiki — page formats, naming conventions, ingest process. Think of it as an employee handbook for the AI.

Karpathy's schema is available as a GitHub gist. Without it, the LLM organizes differently every time. With it, every compilation run follows the same structure.

### Layer 3: The Wiki (What the LLM Builds)
Structured markdown files the LLM "compiles" from raw sources:
- **Entity pages** — people, organizations, projects (merged across sources)
- **Concept pages** — ideas, methods, theories
- **Summaries** — per-source digests
- **Comparison pages** — side-by-side analysis of competing ideas
- **Synthesis pages** — overviews tying multiple sources to a theme
- **index.md** — master catalog by category
- **log.md** — chronological record of all changes

Pages use `[[wikilinks]]`, YAML frontmatter, and Git for version history. This is the [[llm-wiki-pattern]].

## Three Operations

### Ingest
Drop new material into `raw/`. The LLM reads it, extracts key information, and updates 10-15 wiki pages — creating new concept pages, updating existing ones, adding backlinks, refreshing summaries. **Incremental** — doesn't rebuild from scratch. Karpathy calls this "[[knowledge-compilation|compiling]]."

### Query
Search the wiki's index, read relevant pages, synthesize an answer. Because the wiki already contains organized, interlinked summaries, the AI can answer complex cross-source questions that RAG struggles with. At 400K words, Karpathy says it navigates fine using just its own index and summaries — no vector database needed.

### Lint
Periodic maintenance: scan for contradictions, orphan pages, gaps where important topics lack their own page, stale claims. The LLM flags issues and can fix many automatically. Community description: *"a living AI knowledge base that actually heals itself."*

## The Output Layer

Karpathy has the LLM generate outputs as files viewable in [[obsidian]], not just chat responses:
- **Markdown pages** that become part of the wiki (queries get "filed" back)
- **Slide presentations** in Marp format
- **Charts and visualizations** using matplotlib
- **Comparison tables**

Key insight: outputs feed back into the wiki. The system compounds — every question makes the knowledge base richer.

## How to Build It (10 Steps)

1. Install [[obsidian]] (free, cross-platform)
2. Create folder structure: `raw/` and `wiki/`
3. Install the Obsidian Web Clipper browser extension
4. Collect 5-10 articles/papers on a topic into `raw/`
5. Set up an LLM agent (Claude Code, Codex, Cursor, or even Claude's file upload)
6. Copy Karpathy's idea file (GitHub gist)
7. Run the first compilation
8. Start querying
9. File good answers back into the wiki
10. Run lint passes every few weeks

## Limitations

A Substack writer made a key distinction: the LLM excels at **reconnaissance** — mapping the territory, organizing information, finding connections. But **synthesis** — forming original ideas from material — is still a human job.

The article references [[niklas-luhmann]]'s [[zettelkasten]] system. Luhmann's insight: the friction of writing something in your own words isn't wasted effort — it's the mechanism through which understanding happens. Reading someone else's summary is not the same as formulating the idea yourself.

**The honest version**: Karpathy's system eliminates the drudgery of organizing, connecting, and maintaining research materials. It doesn't eliminate the need to think. The AI compiles the territory. You still have to walk it.

## Notable Quotes

- Karpathy: *"In this era of LLM agents, there is less of a point/need of sharing the specific code/app, you just share the idea, then the other person's agent customizes & builds it for your specific needs."*
- [[vamshi-reddy]]: *"Every business has a raw/ directory. Nobody's ever compiled it. That's the product."*
- Article closing: *"The bottleneck was never writing code. It was understanding the problem deeply enough to know what to build. Now there's a system for that."*

## Future Direction

Once a wiki is clean, comprehensive, and well-linked, it could be used to generate synthetic training data and fine-tune a smaller LLM so it actually "knows" the information in its weights — moving from a knowledge base the AI reads at query time to a specialized model that has internalized the entire research domain.

## Mentioned Entities & Concepts

- [[andrej-karpathy]] — creator of the system
- [[vamshi-reddy]] — entrepreneur, quoted on business applications
- [[niklas-luhmann]] — referenced for Zettelkasten parallel
- [[openai]] — Karpathy is co-founder
- [[tesla]] — Karpathy was former AI lead
- [[llm-wiki-pattern]] — the core pattern described
- [[retrieval-augmented-generation]] — contrasted approach
- [[zettelkasten]] — historical parallel
- [[knowledge-compilation]] — the "compiling" metaphor
- [[idea-files]] — sharing ideas instead of code
- [[obsidian]] — recommended tool
- [[vibe-coding]] — term coined by Karpathy, mentioned in passing
