import { db } from "@/db";
import { lintFindings } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * GET /api/projects/nudge-counts
 *
 * Returns { [projectId]: count } for every parent project that has open
 * parent-scoped findings. Projects with zero open findings are omitted so
 * the sidebar badge code can skip rendering anything for them.
 */
export async function GET() {
  const rows = db
    .select({
      projectId: lintFindings.projectId,
      n: sql<number>`count(*)`,
    })
    .from(lintFindings)
    .where(
      and(
        eq(lintFindings.scope, "parent"),
        eq(lintFindings.status, "open")
      )
    )
    .groupBy(lintFindings.projectId)
    .all();

  const counts: Record<number, number> = {};
  for (const row of rows) {
    if (row.n > 0) counts[row.projectId] = row.n;
  }

  return Response.json({ counts });
}
