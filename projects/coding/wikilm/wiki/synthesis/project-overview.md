---
type: synthesis
tags: [engineering-patterns, subprocess, coalescing, multi-provider, cli-tools, dual-source-of-truth, data-layout, generative-ai, wikilm]
sources:
  - sources/engineering-lessons-from-building-wikilm.md
---

# Project Overview: coding/wikilm

## Big Picture

This wiki is a postmortem-in-disguise. The project that built it — [[wikilm]] — generated exactly one source document: [[engineering-lessons-from-building-wikilm]], a retrospective by Nick Elias extracting 7 reusable engineering patterns from production incidents during WikiLM's development. Every page in this wiki flows from that single source.

## Main Topics

**Subprocess correctness** is the dominant theme, spanning three of the seven patterns:

- [[subprocess-cwd-discipline]] — wrong `cwd` silently routes config to the wrong project, producing plausible-looking but incorrect output
- [[non-interactive-subprocess-flags]] — CLI tools block on human prompts when spawned from code; audit flags before every spawn
- [[provider-prefix-dispatch]] — multi-provider routing must branch at a single boundary using a naming convention; split routing produces silent empty results

**Drift** is the second major theme, with two patterns about state diverging over time:

- [[dual-source-of-truth-drift]] — two copies of the same data will drift; WikiLM's `wiki_pages` DB table is effectively dead weight because the filesystem is the real authority
- [[data-layout-enumerator-cascade]] — changing from flat to nested layout silently breaks every *enumerator* (backup, search, lint) — not just write paths

**Scale and integrity** round out the set:

- [[burst-coalescing]] — collapse N rapid recomputation triggers to ≤2 runs via `inFlight` + `pending` flags
- [[generative-pipeline-link-integrity]] — prompt rules alone can't enforce structural constraints in generative output; a code-level validator is also required

## Key Entity

[[wikilm]] is both the subject of this wiki and a concrete illustration of every pattern. The entity page maps each architectural decision directly to the pattern that motivated it.

## Notable Connections

The source explicitly clusters the patterns into pairs: cwd + flags (both about subprocess invocation hygiene), coalescing + dispatch (both create a single absorbing chokepoint), and dual-truth + enumerator cascade (both are drift across different boundaries). Pattern 7 (link integrity) is a standalone instance of the broader rule that generative outputs need structural enforcement beyond prompt guidance.

## Contradictions

None — the wiki has one source. All 7 patterns are consistent and non-overlapping.

## Knowledge Gaps

1. **Link integrity validator** — [[generative-pipeline-link-integrity]] explicitly notes the code-level validator is still TODO as of STO-1765.
2. **Ollama support** — [[wikilm]] notes streaming for research/chat is unsupported for `ollama:*` models; no concept page covers this gap.
3. **Output generation** — WikiLM's planned NotebookLM-style report/deck/infographic output (STO-1766) is not yet reflected in the wiki.
4. **MCP v2 destructive ops** — move/delete/promote via MCP (STO-1767) has no documentation here yet.

## One-Sentence Summary

Seven production-discovered engineering patterns, all extracted from building [[wikilm]] itself — a self-documenting project whose main artifact is a postmortem of its own construction.
