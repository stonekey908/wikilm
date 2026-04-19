---
title: "Engineering Lessons from Building WikiLM"
date: "2026-04-19"
tags: ["engineering-patterns", "subprocess", "coalescing", "multi-provider", "cli-tools", "dual-source-of-truth", "data-layout", "generative-ai", "case-study"]
---
# Engineering Lessons from Building WikiLM

Generic, cross-cutting engineering patterns extracted from building WikiLM — a personal-knowledge-base app with background AI ingestion, nested projects, multi-provider LLM backends, and an MCP server. Each section states the pattern first (reusable across any project), then anchors it to the specific WikiLM incident that surfaced it.

These concepts live under `coding/wikilm` so they can be referenced from any future dev project under `coding/`.

---

## 1. Subprocess working-directory discipline

**The pattern.** When your code spawns a child process — a CLI tool, a worker, an AI agent — the child's working directory (`cwd`) determines how it resolves:

- Relative paths in its arguments
- Config files it walks up the filesystem to find (`.claude/CLAUDE.md`, `tsconfig.json`, `.env`, `pyproject.toml`, `package.json`, etc.)
- Any "project root" inference it does

If you spawn from the wrong `cwd`, the subprocess looks authoritative but acts on the wrong context. This failure mode is silent — the subprocess produces valid-looking output against the wrong inputs.

**How it breaks.** WikiLM spawns Claude CLI subprocesses to ingest sources, synthesize, and lint — one per project. Early spawns used `process.cwd()` (the repo root) as `cwd`. Claude walked up, found the *repo-root* `.claude/CLAUDE.md` describing a flat layout, and wrote wiki pages into the top-level `wiki/` instead of the specific project's `projects/<slug>/wiki/`. Ten-plus endpoints had to be audited and fixed.

**How to detect / avoid.**

- Whenever you spawn a subprocess, decide explicitly what its `cwd` should be. Don't default to the parent's cwd unless that's genuinely correct.
- If the subprocess relies on walked-up config (most modern tools do), scaffold a config file at the intended `cwd` so it stops walking there. WikiLM now scaffolds a per-project `.claude/CLAUDE.md`.
- Add a smoke test that spawns the subprocess from an adversarial `cwd` and verifies it fails loudly rather than silently picking up the wrong config.

**Case study.** STO-1758 foundation fix + STO-1763 per-project CLAUDE.md scaffold; `createProjectDirectories` in `src/lib/projects.ts`; backfill endpoint at `/api/admin/backfill-claude-md`.

---

## 2. Burst coalescing for triggered work

**The pattern.** When expensive work is triggered by events — each new input fires a re-computation — N rapid events produce N jobs. If the work is a whole-corpus recomputation (synthesis, re-index, re-embed, rebuild), most of those jobs are wasted: only the last one matters.

Fix with two in-memory flags per trigger type:

- `inFlight: boolean` — a job is currently running
- `pending: boolean` — at least one event arrived during the in-flight run

On event:
- If not in-flight → start a job, set `inFlight`
- If in-flight → set `pending`, return

On job complete:
- Clear `inFlight`
- If `pending`, start a new job with `inFlight=true`, clear `pending`

Result: N events collapse to at most 2 jobs — the one already running plus at most one follow-up that captures everything that arrived during it.

**How it breaks without this.** WikiLM's onComplete handler fired synthesis after each ingest. Ingest a batch of ten sources at once → ten synthesis jobs queued, each re-reading the entire corpus, each invalidating the previous one's output. Job queue saturates, concurrency cap starts rejecting other work.

**How to detect / avoid.**

- Any "after-X, do Y" handler where Y is whole-corpus is a coalescing candidate
- If Y is per-event work (write a log line, send a notification), coalescing is usually wrong — don't confuse the two
- In-memory flags are fragile across restarts — document explicitly what happens on restart (for WikiLM: next event re-triggers a full run; acceptable staleness window, not data loss)

**Case study.** `claude-runner.ts` `synthesisInFlight` + `synthesisPending` flags.

---

## 3. Provider-prefix dispatch at one boundary

**The pattern.** When you add multi-provider support (multiple LLMs, multiple search engines, multiple storage backends), you have a choice:

- Branch at every call site (`if claude: … else if gemini: … else if ollama: …`)
- Branch once at the boundary

The first approach is a trap: every new call site is another place to forget the new provider. Instead, pick a naming convention that encodes provider + model in a single string (WikiLM uses `"sonnet"` for Claude, `"ollama:<model>"`, `"gemini:<model>"`), and dispatch at one chokepoint that returns a provider-neutral interface.

**How it breaks without this.** WikiLM's `streamClaude` was literally hardcoded to Claude. When Gemini support was added, the research flow silently produced empty results because the stream function was still spawning `claude` regardless of user selection. No error — just nothing. Users thought Gemini was broken; actually it was never called.

**How to detect / avoid.**

- If a function name encodes a provider (`streamClaude`, `queryOpenAI`), treat it as tech debt the moment a second provider lands
- The dispatch layer should emit structured errors when a provider isn't implemented yet, not silently no-op (Ollama streaming in WikiLM emits "not supported yet" explicitly)
- Model-ID formats matter: bare aliases get ambiguous fast — prefer a prefix so parsing is trivial

**Case study.** `streamClaude` + `startJobProcess` both dispatch on model prefix.

---

## 4. Non-interactive subprocess flags

**The pattern.** CLI tools were designed for humans at terminals. When you invoke them from code, they assume a `tty` and block on prompts the invoking code can't see or answer. The subprocess hangs forever; the parent times out or deadlocks.

Every CLI invoked from code needs a non-interactive invocation. Read the flags page; don't assume "it works in my terminal" transfers.

**How it breaks.** WikiLM invoked `claude -p` to run ingest — it prompted for write-permission approval and hung. Added `--allowedTools "Write" "Edit" "Read" "WebSearch" "WebFetch"`. Later, added Gemini support via the `gemini` CLI — it needed `-y` (yolo) to auto-approve tool use, plus `-o text` for deterministic output. Without these flags every subprocess Claude/Gemini call would silently hang.

**How to detect / avoid.**

- The first time you spawn a CLI from code, test with no stdin attached and a short timeout — expose hangs immediately
- Flags to check for: non-interactive/batch mode, auto-approve, default-yes, output-format, disable-progress-bar, disable-color
- When a tool version bumps, re-verify these flags — new prompts get added

**Case study.** `claude -p --allowedTools …`; Gemini `-y -o text`; both in subprocess spawn args.

---

## 5. Dual sources of truth drift

**The pattern.** When the same data lives in two places — a database table *and* filesystem markdown, a cache *and* the source, a denormalised column *and* its source of truth — they drift silently. One writer updates one side; the other side becomes stale. Reads that hit the wrong side return lies.

The only sustainable fix is to pick one side as authoritative and derive the other on demand. If you must have both, add a reconciliation job and make drift loudly detectable (row-count mismatches, checksum comparisons).

**How it breaks.** WikiLM has a `wiki_pages` database table and also markdown files on disk under `wiki/`. The ingest pipeline writes to disk; the API reads from disk. The DB table exists from an older design and never got removed. Any new contributor reading the schema assumes the DB is authoritative and introduces drift.

**How to detect / avoid.**

- When you see data in two places, answer *on paper* which is authoritative
- Delete the non-authoritative copy or at minimum mark it explicitly (`-- deprecated: not synced with filesystem`)
- If a derived copy is necessary for performance (a search index, a cache), build the derivation from the authoritative source and ensure it can be rebuilt from scratch

**Case study.** `wiki_pages` DB table vs. filesystem `wiki/` + `projects/<slug>/wiki/` — API reads from disk; DB is effectively dead weight.

---

## 6. Data-layout changes cascade to every enumerator

**The pattern.** When you change a data layout — flat → nested, single-tenant → multi-tenant, one-directory → sharded — every tool that *enumerates* your data needs to be audited. Not just the writers; the readers and bulk-processors are where layout changes go to die.

Tools that typically break:

- Backup / export scripts
- Search indexers
- Lint / health-check passes
- Migrations
- Observability dashboards ("files on disk" style queries)

**How it breaks.** WikiLM moved from flat `wiki/` to flat `wiki/` + per-project `projects/<slug>/wiki/`. The backup script `tar`ed only the top-level `wiki/`. Nothing errored. The backup just silently contained less data each day, and nobody noticed until someone restored and the project wikis were gone.

**How to detect / avoid.**

- Before merging a layout change, grep the codebase for every place that reads the old layout path — not just writes
- A "find every enumerator" checklist as part of layout-change PRs: backup, search, lint, migration, sync, export, import, docs-gen
- Integration test: create data in the new layout, run backup+restore, diff

**Case study.** Backup tar renamed to `content-<ts>.tar.gz` and now includes both `wiki/` and `projects/`. Also surfaced in `persistLintFindings` scope-clearing: a parent-scope lint run would wipe child-scope findings because the enumerator didn't partition correctly.

---

## 7. Link integrity in generative AI pipelines

**The pattern.** When an AI pipeline produces linked artifacts — wiki pages with wikilinks, cross-references in reports, citations in answers, function calls in code — prompting the model to "only link things that exist" is necessary but not sufficient. Soft rules drift. Models hallucinate convenient entities. Citations become broken references.

Enforce integrity at *two* points:

1. **At generation**: prompt discipline that lists existing linkable entities, forbids invention
2. **At write-time or post-hoc**: a lint/validator that walks the output and flags (or fixes) unresolved links

Either alone is insufficient. Prompt discipline drifts across model versions and long contexts. Post-hoc lint without prompt discipline catches symptoms after the generation cost is already paid.

**How it breaks.** WikiLM's ingest prompt lets the model write `[[Alice Chen]]` as a wikilink even if no `entities/alice-chen.md` exists. Result: dangling wikilinks that look authoritative but 404. STO-1765 tightened the prompt (wikilink discipline rule + list of existing sibling/parent entities). Improvement, but not zero-risk — the rule is soft guidance, not enforced by code. The code-enforcement layer is still TODO.

**How to detect / avoid.**

- Every generative pipeline that produces linked output needs both halves: prompt rule + code validator
- Run the validator as part of the ingest finalization, not only on explicit lint
- When the model hallucinates a link, decide in advance: create the referenced page as a stub, strip the link, or reject the output — consistent policy beats ad-hoc cleanup

**Case study.** STO-1765 ingest prompt wikilink discipline. STO-1765 v2 (future): auto-create stub pages for every wikilinked entity as part of ingest.

---

## How these connect

The concepts reinforce each other:

- **#1 (cwd)** + **#4 (non-interactive flags)** are both about invoking subprocesses correctly; the WikiLM endpoint audit touched both at once
- **#2 (coalescing)** and **#3 (provider dispatch)** are both about a single chokepoint handling many inputs — coalescing collapses events, dispatch collapses providers
- **#5 (dual truth)** and **#6 (layout enumerators)** are both about drift — one across storage boundaries, one across time
- **#7 (link integrity)** is a specific case of a broader principle: generative AI outputs need structural validators, not just prompt rules

Every one of these was discovered *in production* on WikiLM, not predicted up front. That is the meta-lesson: these patterns are invisible in the design phase and obvious in the postmortem.
