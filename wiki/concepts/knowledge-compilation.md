---
type: concept
tags: [knowledge-management, llm, metaphor]
---

# Knowledge Compilation

A metaphor used by [[andrej-karpathy]] to describe the core operation of the [[llm-wiki-pattern]]. Borrowed from programming, where source code gets translated ("compiled") into something executable. In the wiki pattern, raw research gets translated into organized knowledge.

## The Metaphor

| Programming | Knowledge |
|---|---|
| Source code | Raw research materials |
| Compiler | LLM + schema |
| Executable | Structured, interlinked wiki |
| Incremental compilation | New source updates existing wiki pages |

## Key Properties

- **Incremental**: The LLM doesn't rebuild the wiki from scratch. Each new source is integrated into the existing structure — creating new pages, updating existing ones, adding backlinks.
- **Deterministic structure**: The schema (CLAUDE.md) ensures consistent output format across compilation runs.
- **Compounding**: Each compilation enriches the wiki. Cross-references grow. Entity pages accumulate information from multiple sources.

## The Business Angle

[[vamshi-reddy]] extended the metaphor: *"Every business has a raw/ directory. Nobody's ever compiled it. That's the product."* — suggesting that the gap between raw organizational knowledge and compiled, usable knowledge is a major untapped opportunity.

## Sources

- [[karpathy-second-brain-medium-article]]
