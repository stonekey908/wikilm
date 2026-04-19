---
type: source
title: "Engineering Lessons from Building WikiLM"
author: "Nick Elias"
date: "2026-04-19"
source_file: "raw/engineering-lessons-from-building-wikilm.md"
tags: [engineering-patterns, subprocess, coalescing, multi-provider, cli-tools, dual-source-of-truth, data-layout, generative-ai, case-study]
---

# Engineering Lessons from Building WikiLM

A postmortem-style extraction of seven cross-cutting engineering patterns, each discovered in production while building [[wikilm]]. The source frames each pattern generically first, then grounds it in a specific WikiLM incident — making the lessons portable to any future project.

## Key Takeaways

### Seven patterns, in order of discovery

1. **[[subprocess-cwd-discipline]]** — subprocess `cwd` determines which config files get picked up; wrong `cwd` produces valid-looking output against the wrong context. WikiLM hit this across 10+ endpoints when Claude subprocesses walked up to the repo-root CLAUDE.md instead of the project-level one.

2. **[[burst-coalescing]]** — N rapid events each triggering whole-corpus recomputation collapses to at most 2 runs via two boolean flags (`inFlight` + `pending`). WikiLM's synthesis job queue saturated on batch ingests before this was added.

3. **[[provider-prefix-dispatch]]** — multi-provider support requires branching at one boundary with a naming convention encoding provider+model (e.g. `"gemini:<model>"`). Without it, WikiLM's `streamClaude` silently produced empty results when Gemini was selected.

4. **[[non-interactive-subprocess-flags]]** — CLI tools designed for humans block on prompts when invoked from code; every spawned CLI needs its non-interactive flags audited. WikiLM needed `--allowedTools` for Claude and `-y -o text` for Gemini.

5. **[[dual-source-of-truth-drift]]** — data in two places drifts silently; pick one authoritative side. WikiLM's `wiki_pages` DB table is effectively dead weight because the API reads from disk.

6. **[[data-layout-enumerator-cascade]]** — layout changes (flat → nested) break every *enumerator*, not just writers. WikiLM's backup script silently excluded all project wikis after the nesting migration.

7. **[[generative-pipeline-link-integrity]]** — prompt discipline alone is insufficient for link integrity; a code-level validator is also required. WikiLM's ingest tightened prompts (STO-1765) but post-hoc enforcement is still TODO.

## Notable Connections the Source Draws

- **#1 + #4** (cwd + non-interactive flags): both about correct subprocess invocation; WikiLM's endpoint audit touched both simultaneously.
- **#2 + #3** (coalescing + dispatch): both create a single chokepoint that absorbs many inputs.
- **#5 + #6** (dual truth + enumerator cascade): both are drift problems — across storage boundaries vs. across time.
- **#7**: a specific instance of the broader rule that generative AI outputs need structural validators, not just prompt rules.

## Meta-Lesson

> "Every one of these was discovered *in production* on WikiLM, not predicted up front. That is the meta-lesson: these patterns are invisible in the design phase and obvious in the postmortem."

## Cross-References

- All 7 concepts above have their own pages in this wiki
- [[wikilm]] — entity page for the WikiLM system
