import { NextRequest } from "next/server";
import { db } from "@/db";
import { lintFindings, projects } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * GET /api/dashboard/nudges?projectId=<n>
 *
 * Returns open parent-scoped lint findings for the given project, grouped
 * by type, each enriched with the project's slug for cross-linking. Empty
 * arrays when no findings exist for a type — the UI hides the section
 * entirely when all three groups are empty.
 *
 * Without a projectId the endpoint returns findings across all projects
 * (legacy behavior — kept so ad-hoc curl calls still work).
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
  // Parent-scope nudges (promotion/theme/gap) — shown expanded by default.
  promotion: DashboardNudge[];
  theme: DashboardNudge[];
  gap: DashboardNudge[];
  // Project-scope lint highlights — shown collapsed on the Ledger so they
  // don't flood the page. Full list lives at /lint; Marginalia returns the
  // first PROJECT_GROUP_LIMIT entries plus a total count per group.
  suggestedQuestion: DashboardNudge[];
  missingCrossRef: DashboardNudge[];
  missingConcept: DashboardNudge[];
  projectGroupTotals: {
    suggestedQuestion: number;
    missingCrossRef: number;
    missingConcept: number;
  };
}

const PROJECT_GROUP_LIMIT = 5;

export async function GET(request: NextRequest) {
  const projectIdParam = request.nextUrl.searchParams.get("projectId");
  const projectId = projectIdParam ? Number(projectIdParam) : null;
  const hasProject = projectId !== null && Number.isFinite(projectId);

  // Parent-scope rows (cross-project nudges).
  const parentWhere = hasProject
    ? and(
        eq(lintFindings.scope, "parent"),
        eq(lintFindings.status, "open"),
        eq(lintFindings.projectId, projectId)
      )
    : and(eq(lintFindings.scope, "parent"), eq(lintFindings.status, "open"));

  const parentRows = db
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
    .where(parentWhere)
    .orderBy(desc(lintFindings.createdAt))
    .all();

  // Project-scope rows (this-project lint highlights). Only surface the
  // categories the user asked to see on the Ledger — the rest stay exclusive
  // to /lint.
  const projectWhere = hasProject
    ? and(
        eq(lintFindings.scope, "project"),
        eq(lintFindings.status, "open"),
        eq(lintFindings.projectId, projectId)
      )
    : and(eq(lintFindings.scope, "project"), eq(lintFindings.status, "open"));

  const projectRows = db
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
    .where(projectWhere)
    .orderBy(desc(lintFindings.createdAt))
    .all();

  const response: NudgesResponse = {
    promotion: [],
    theme: [],
    gap: [],
    suggestedQuestion: [],
    missingCrossRef: [],
    missingConcept: [],
    projectGroupTotals: {
      suggestedQuestion: 0,
      missingCrossRef: 0,
      missingConcept: 0,
    },
  };

  const toNudge = (row: (typeof parentRows)[number]): DashboardNudge => ({
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
  });

  for (const row of parentRows) {
    const n = toNudge(row);
    if (row.category === "promotion_candidate") response.promotion.push(n);
    else if (row.category === "recurring_theme") response.theme.push(n);
    else if (row.category === "parent_gap") response.gap.push(n);
  }

  for (const row of projectRows) {
    if (row.category === "suggested_question") {
      response.projectGroupTotals.suggestedQuestion++;
      if (response.suggestedQuestion.length < PROJECT_GROUP_LIMIT) {
        response.suggestedQuestion.push(toNudge(row));
      }
    } else if (row.category === "missing_cross_ref") {
      response.projectGroupTotals.missingCrossRef++;
      if (response.missingCrossRef.length < PROJECT_GROUP_LIMIT) {
        response.missingCrossRef.push(toNudge(row));
      }
    } else if (row.category === "missing_concept") {
      response.projectGroupTotals.missingConcept++;
      if (response.missingConcept.length < PROJECT_GROUP_LIMIT) {
        response.missingConcept.push(toNudge(row));
      }
    }
  }

  return Response.json(response);
}
