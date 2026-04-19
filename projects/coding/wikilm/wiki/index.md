# Wiki Index

> Tip: to link across projects, use `[[project-slug/page-name]]`.

## Sources

- [[engineering-lessons-from-building-wikilm]] — 7 generic engineering patterns extracted from building WikiLM, with incident case studies

## Entities

- [[wikilm]] — Personal LLM-powered knowledge base; source of all 7 engineering patterns in this wiki

## Concepts

- [[subprocess-cwd-discipline]] — subprocess cwd determines config resolution; wrong cwd produces valid-looking output against wrong context
- [[burst-coalescing]] — collapse N whole-corpus recomputation triggers to ≤2 runs via inFlight + pending flags
- [[provider-prefix-dispatch]] — multi-provider support requires a single dispatch boundary with prefix-encoded model strings
- [[non-interactive-subprocess-flags]] — CLI tools designed for humans block on prompts from code; audit flags before every spawn
- [[dual-source-of-truth-drift]] — data in two places drifts silently; pick one authoritative side
- [[data-layout-enumerator-cascade]] — layout changes (flat → nested) break every enumerator (backup, search, lint) not just writers
- [[generative-pipeline-link-integrity]] — prompt discipline alone is insufficient; a code-level validator is also required

## Comparisons

## Synthesis

- [[project-overview]] — big-picture overview: 7 engineering patterns from building WikiLM, themes, gaps, and connections

## Queries
