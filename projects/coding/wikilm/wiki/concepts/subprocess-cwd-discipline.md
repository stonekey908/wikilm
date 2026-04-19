---
type: concept
tags: [subprocess, cwd, cli-tools, configuration, engineering-patterns]
---

# Subprocess CWD Discipline

When code spawns a child process, the child's working directory (`cwd`) determines how it resolves:

- Relative paths in arguments
- Config files it walks up the filesystem to find (`.claude/CLAUDE.md`, `tsconfig.json`, `.env`, `package.json`, etc.)
- Any "project root" inference it performs internally

**The failure mode is silent.** The subprocess produces valid-looking output against the wrong inputs — no error, no warning, just wrong behavior.

## The Fix

1. **Decide the `cwd` explicitly** at every spawn site. Never default to the parent's `cwd` unless it's provably correct.
2. **Scaffold a config file** at the intended `cwd` so walked-up searches stop there. This prevents accidental config inheritance from ancestor directories.
3. **Smoke-test from an adversarial `cwd`** — verify the subprocess fails loudly rather than silently picking up wrong config.

## WikiLM Incident

[[wikilm]] spawned Claude CLI subprocesses for ingest, synthesis, and lint — one per project. Early spawns used `process.cwd()` (repo root). Claude walked up, found the *repo-root* `.claude/CLAUDE.md` describing a flat layout, and wrote wiki pages into the top-level `wiki/` instead of `projects/<slug>/wiki/`. Over 10 endpoints had to be audited and fixed.

Resolution: `createProjectDirectories` in `src/lib/projects.ts` now scaffolds a per-project `.claude/CLAUDE.md` at creation time. Backfill endpoint: `/api/admin/backfill-claude-md`.

Tickets: STO-1758 (foundation fix), STO-1763 (per-project CLAUDE.md scaffold).

## Related Concepts

- [[non-interactive-subprocess-flags]] — the other half of "invoking subprocesses correctly"
- [[provider-prefix-dispatch]] — the dispatch boundary that determines *what* to spawn
- [[data-layout-enumerator-cascade]] — layout changes compound this problem when paths change

## Source

[[engineering-lessons-from-building-wikilm]]
