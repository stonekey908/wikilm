---
type: concept
tags: [coalescing, job-queue, concurrency, engineering-patterns, background-jobs]
---

# Burst Coalescing

When expensive work is triggered by events — and that work is a whole-corpus recomputation — N rapid events produce N jobs, most of which are wasted. Only the *last* one matters.

## The Two-Flag Pattern

Maintain two in-memory booleans per trigger type:

- `inFlight` — a job is currently running
- `pending` — at least one event arrived while `inFlight` was true

**On event:**
- If `!inFlight` → start a job, set `inFlight = true`
- If `inFlight` → set `pending = true`, return

**On job complete:**
- Clear `inFlight`
- If `pending`, start a new job with `inFlight = true`, clear `pending`

Result: N events collapse to **at most 2 jobs** — the in-progress run plus one follow-up that captures everything that arrived during it.

## When to Apply (and When Not To)

**Apply when** Y is whole-corpus work (synthesis, re-index, rebuild, recompute).

**Do not apply when** Y is per-event work (write a log line, send a notification, process a queue item). Per-event work must not be coalesced.

## Restart Fragility

In-memory flags don't survive server restarts. Document explicitly what happens: for [[wikilm]], the next ingest after a restart re-triggers a full synthesis run — acceptable staleness, not data loss.

## WikiLM Incident

`onComplete` in the ingest pipeline fired synthesis after each ingest. Ingesting 10 sources at once queued 10 synthesis jobs — each re-reading the entire corpus, each invalidating the previous. The job queue saturated and started rejecting other work.

Resolution: `synthesisInFlight` + `synthesisPending` flags added to `claude-runner.ts`.

## Related Concepts

- [[provider-prefix-dispatch]] — the dispatch layer that the coalesced job passes through
- [[subprocess-cwd-discipline]] — the subprocess that the coalesced job spawns
- [[data-layout-enumerator-cascade]] — whole-corpus jobs are also where enumerator bugs surface

## Source

[[engineering-lessons-from-building-wikilm]]
