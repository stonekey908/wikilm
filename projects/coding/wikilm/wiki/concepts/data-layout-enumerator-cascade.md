---
type: concept
tags: [data-layout, migration, backup, enumerators, engineering-patterns, architecture]
---

# Data Layout Enumerator Cascade

When you change a data layout — flat → nested, single-tenant → multi-tenant, one directory → sharded — **every tool that enumerates your data must be audited**. Not just writers; readers and bulk-processors are where layout changes go to die.

## Tools That Typically Break

- Backup / export scripts
- Search indexers
- Lint / health-check passes
- Migrations
- Observability dashboards ("files on disk" style queries)
- Sync jobs
- Doc-gen / static-site builders

None of these error. They just silently cover less data.

## The Checklist for Layout Change PRs

Before merging any layout-changing PR:

1. Grep the codebase for every place that reads the old layout path — not just writes
2. Enumerate: backup, search, lint, migration, sync, export, import, docs-gen
3. Integration test: create data in the new layout, run backup+restore, diff — verify nothing is missing

## WikiLM Incident

[[wikilm]] migrated from flat `wiki/` to flat `wiki/` + per-project `projects/<slug>/wiki/`. The backup script `tar`ed only the top-level `wiki/`. Nothing errored. Each day's backup silently contained less data. Nobody noticed until a restore attempt confirmed the project wikis were gone.

Also surfaced in `persistLintFindings`: a parent-scope lint run wiped child-scope findings because the enumerator didn't partition by scope correctly.

Resolution: backup tar renamed to `content-<ts>.tar.gz`, now includes both `wiki/` and `projects/`.

## Related Concepts

- [[dual-source-of-truth-drift]] — the companion drift problem across storage boundaries
- [[subprocess-cwd-discipline]] — layout changes compound cwd problems when paths change
- [[burst-coalescing]] — whole-corpus jobs (synthesis, lint) are where enumerator bugs surface

## Source

[[engineering-lessons-from-building-wikilm]]
