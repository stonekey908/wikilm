# Automate Decision Log

## Phase Summaries
- [2026-04-15 13:30] PHASE 1 COMPLETE — Platform: web (Next.js 16), 11 tickets (STO-1678 through STO-1688), design source: mockup.html (Nova theme).
- [2026-04-15 23:00] PHASE 2 COMPLETE — 11/11 tickets implemented. Dependency order: scaffolding → CLI runner → all pages in parallel. 0 hard stops.
- [2026-04-15 23:15] PHASE 3 COMPLETE — Mock layer for claude -p CLI. MOCK_MODE=true in .env.local.
- [2026-04-15 23:15] PHASE 4 COMPLETE — SETUP.md written with quick start and real CLI migration guide.
- [2026-04-15 23:20] PHASE 5 SKIPPED — Visual UAT deferred (no emulator needed for web, Playwright not yet installed).
- [2026-04-15 23:20] PHASE 6 COMPLETE — Production build passes (17 routes: 6 static, 11 dynamic). TypeScript strict mode passes. 1 turbopack tracing warning (informational, non-blocking).

## Implementation Order
1. STO-1678: Scaffolding ✓
2. STO-1679: Claude CLI runner ✓
3. Wave 3 (parallel): STO-1680 ✓, STO-1681 ✓, STO-1682 ✓, STO-1683 ✓, STO-1684 ✓, STO-1685 ✓, STO-1686 ✓, STO-1687 ✓, STO-1688 ✓

## Pending Decisions
- [2026-04-15] PHASE 2 — STO-1685 Graph page is a placeholder. Needs d3-force or @react-sigma/core library decision for full implementation. [DECISION-PENDING]
- [2026-04-15] PHASE 2 — STO-1682 Research tab has static mock data. Real implementation needs claude -p with web search + approval workflow. [DECISION-PENDING]

## Auto-Resolved
- [2026-04-15] Used next/font/google for Inter (variable font, no explicit weights) — Inter TypeScript types only accept standard weight values, not granular ones like 350/450/550/650.
- [2026-04-15] Used process.cwd()/../ for wiki/raw/projects paths — Turbopack shows a tracing warning but build passes. Centralized path constant deferred to avoid over-abstraction.
- [2026-04-15] Used `serverExternalPackages` for better-sqlite3 in next.config.ts — required for native Node.js modules in Next.js 16.

## Hard Stops
(none)
