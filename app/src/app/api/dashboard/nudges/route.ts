import { db } from "@/db";
import { lintFindings, projects } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * GET /api/dashboard/nudges
 *
 * Returns open parent-scoped lint findings grouped by type, each enriched
 * with the parent project's slug for cross-linking. Empty arrays when no
 * findings exist for a type — the UI hides the section entirely when all
 * three groups are empty.
 */
export interface DashboardNudge {
  id: number;
  projectId: number;
  projectSlug: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  targetPage: string | null;
  suggestedAction: string | null;
  dedupeKey: string;
  createdAt: string;
}

export interface NudgesResponse {
  promotion: DashboardNudge[];
  theme: DashboardNudge[];
  gap: DashboardNudge[];
}

export async function GET() {
  const rows = db
    .select({
      id: lintFindings.id,
      projectId: lintFindings.projectId,
      projectSlug: projects.slug,
      category: lintFindings.category,
      severity: lintFindings.severity,
      title: lintFindings.title,
      description: lintFindings.description,
      targetPage: lintFindings.targetPage,
      suggestedAction: lintFindings.suggestedAction,
      dedupeKey: lintFindings.dedupeKey,
      createdAt: lintFindings.createdAt,
    })
    .from(lintFindings)
    .innerJoin(projects, eq(projects.id, lintFindings.projectId))
    .where(
      and(
        eq(lintFindings.scope, "parent"),
        eq(lintFindings.status, "open")
      )
    )
    .orderBy(desc(lintFindings.createdAt))
    .all();

  const response: NudgesResponse = {
    promotion: [],
    theme: [],
    gap: [],
  };

  for (const row of rows) {
    const nudge: DashboardNudge = {
      id: row.id,
      projectId: row.projectId,
      projectSlug: row.projectSlug,
      category: row.category,
      severity: row.severity,
      title: row.title,
      description: row.description,
      targetPage: row.targetPage,
      suggestedAction: row.suggestedAction,
      dedupeKey: row.dedupeKey,
      createdAt: row.createdAt,
    };
    if (row.category === "promotion_candidate") response.promotion.push(nudge);
    else if (row.category === "recurring_theme") response.theme.push(nudge);
    else if (row.category === "parent_gap") response.gap.push(nudge);
  }

  return Response.json(response);
}
