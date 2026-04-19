# Wiki Log

## [2026-04-19] update | Synthesis: project-overview

Created `synthesis/project-overview.md`. Covers all 7 engineering patterns, two main themes (subprocess correctness, drift), notable source-drawn connections, and 4 identified knowledge gaps (link integrity validator, Ollama support, output generation, MCP v2 destructive ops). Updated `index.md` to list the synthesis page.

## [2026-04-19] ingest | Engineering Lessons from Building WikiLM

Processed `raw/engineering-lessons-from-building-wikilm.md`.

**Pages created (9 total):**
- `sources/engineering-lessons-from-building-wikilm.md` — source summary with all 7 patterns and cross-references
- `entities/wikilm.md` — WikiLM project entity page
- `concepts/subprocess-cwd-discipline.md`
- `concepts/burst-coalescing.md`
- `concepts/provider-prefix-dispatch.md`
- `concepts/non-interactive-subprocess-flags.md`
- `concepts/dual-source-of-truth-drift.md`
- `concepts/data-layout-enumerator-cascade.md`
- `concepts/generative-pipeline-link-integrity.md`

All 7 concept pages cross-link to each other along the axes identified in the source (subprocess pair: #1+#4; chokepoint pair: #2+#3; drift pair: #5+#6; #7 as generative AI validator principle). Source and entity pages link to all 7 concepts.
