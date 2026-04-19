import { backfillProjectClaudeMd } from "@/lib/projects";

/**
 * POST /api/admin/backfill-claude-md
 *
 * One-shot migration for STO-1763: ensures every nested project has its own
 * .claude/CLAUDE.md so Claude subprocesses stop walking up to the repo root.
 * Idempotent — skips projects that already have one. Safe to run repeatedly.
 */
export async function POST() {
  const result = backfillProjectClaudeMd();
  return Response.json(result);
}
