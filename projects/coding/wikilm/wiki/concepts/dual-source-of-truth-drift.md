---
type: concept
tags: [data-integrity, drift, database, filesystem, engineering-patterns, architecture]
---

# Dual Source of Truth Drift

When the same data lives in two places — a DB table and a filesystem, a cache and its source, a denormalized column and its origin — they drift silently. One writer updates one side; the other side becomes stale. Reads hitting the wrong side return lies.

**The drift is silent.** No error. No mismatch warning. Just wrong data.

## The Only Sustainable Fix

Pick one side as **authoritative** and derive the other on demand. If both must exist:

1. Add a reconciliation job
2. Make drift **loudly detectable** — row-count mismatches, checksum comparisons, staleness timestamps

## When You Spot Dual Truth

Answer *on paper* which side is authoritative. Then either:
- Delete the non-authoritative copy
- Mark it explicitly deprecated (e.g., `-- deprecated: not synced with filesystem`) so future readers don't trust it

If a derived copy is necessary for performance (search index, cache), build the derivation from the authoritative source and ensure it can be fully rebuilt from scratch.

## WikiLM Incident

[[wikilm]] has a `wiki_pages` database table (from an earlier design) and markdown files on disk under `wiki/` and `projects/<slug>/wiki/`. The ingest pipeline writes to disk; the API reads from disk. The DB table was never removed. Any new contributor reading the schema would assume DB is authoritative and introduce drift.

Current state: DB is effectively dead weight. The filesystem is authoritative. The table has never been cleaned up.

## Related Concepts

- [[data-layout-enumerator-cascade]] — the companion drift problem that occurs across time when layouts change
- [[subprocess-cwd-discipline]] — wrong subprocess cwd is a related "wrong side" problem: right data, wrong location

## Source

[[engineering-lessons-from-building-wikilm]]
