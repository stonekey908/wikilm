---
type: concept
tags: [generative-ai, link-integrity, validation, wikilinks, engineering-patterns, llm]
---

# Generative Pipeline Link Integrity

When an AI pipeline produces linked artifacts — wiki pages with wikilinks, cross-references in reports, citations in answers, function calls in code — prompting the model to "only link things that exist" is **necessary but not sufficient**.

Soft rules drift. Models hallucinate convenient entities. Citations become broken references.

## The Two-Point Enforcement Model

| Point | What it does | Why it's needed |
|---|---|---|
| **At generation** | Prompt discipline: list existing linkable entities, forbid invention | Reduces hallucination rate; catches problems at the cheapest point |
| **At write-time / post-hoc** | Code validator: walk output, flag or fix unresolved links | Catches what prompt rules miss; catches model drift across versions |

**Either alone is insufficient:**
- Prompt discipline without a validator: problems accumulate silently until a lint pass
- Validator without prompt discipline: catches symptoms after generation cost is already paid

## Resolution Policy

When the validator finds a dangling link, decide in advance (per system, not per-incident):

1. **Create the referenced page as a stub** — preserves the link graph, surfaces gaps
2. **Strip the link** — conservative; loses the connection
3. **Reject the output** — expensive retry; appropriate for high-stakes pipelines

Consistent policy beats ad-hoc cleanup.

## WikiLM Incident

[[wikilm]]'s ingest prompt let the model write `[[Alice Chen]]` as a wikilink even if no `entities/alice-chen.md` existed. Result: dangling wikilinks that look authoritative but 404.

STO-1765 tightened the prompt (wikilink discipline rule + list of existing sibling/parent entities to prefer). Improvement, but not zero-risk — the rule is soft guidance, not enforced by code. The code-enforcement validator is still TODO (STO-1765 v2: auto-create stub pages for every wikilinked entity during ingest finalization).

## Related Concepts

- [[provider-prefix-dispatch]] — the dispatch layer that routes the generative call
- [[subprocess-cwd-discipline]] — the subprocess that writes the generative output must land in the right project

## Source

[[engineering-lessons-from-building-wikilm]]
