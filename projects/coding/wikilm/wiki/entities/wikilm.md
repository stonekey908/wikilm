---
type: entity
entity_type: project
tags: [wikilm, personal-knowledge-base, llm, next-js, mcp, engineering-patterns]
---

# WikiLM

A personal knowledge base system following the Karpathy LLM Wiki pattern: raw source material goes in, structured interlinked markdown comes out. Built by Nick Elias as a SecondBrain application.

## What It Is

- **Input layer (`raw/`):** Read-only source material — articles, notes, PDFs, web research
- **Wiki layer (`wiki/`):** LLM-maintained markdown pages with YAML frontmatter, wikilinks, and a master index
- **Projects:** Nested project tree with materialised-path slugs (e.g. `coding/wikilm`), each with its own `wiki/` directory
- **MCP server:** Exposes 8 tools (list_projects, create_project, search_wiki, read_wiki_page, list_wiki_pages, get_project_synthesis, save_learning, get_job_status) for use from any Claude Code session

## Key Architecture Decisions

- **Filesystem is authoritative** — no DB-backed wiki pages; the `wiki_pages` DB table exists but is dead weight ([[dual-source-of-truth-drift]])
- **Subprocess cwd = project root** — every Claude/Gemini/Ollama subprocess spawns with `cwd` set to the specific project directory ([[subprocess-cwd-discipline]])
- **Provider-prefix dispatch** — model string encodes provider (`"gemini:<model>"`, `"ollama:<model>"`, bare alias = Claude) ([[provider-prefix-dispatch]])
- **Burst coalescing** — synthesis and lint jobs coalesce with `inFlight`/`pending` flags in `claude-runner.ts` ([[burst-coalescing]])
- **Per-project `.claude/CLAUDE.md`** — scaffolded at project creation to stop subprocess config-walk at the project boundary

## Engineering Lessons Extracted

This project is the source for 7 generic engineering patterns documented in this wiki:

1. [[subprocess-cwd-discipline]]
2. [[burst-coalescing]]
3. [[provider-prefix-dispatch]]
4. [[non-interactive-subprocess-flags]]
5. [[dual-source-of-truth-drift]]
6. [[data-layout-enumerator-cascade]]
7. [[generative-pipeline-link-integrity]]

## Sources

- [[engineering-lessons-from-building-wikilm]]
