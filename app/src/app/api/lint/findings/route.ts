import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs, lintFindings } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("projectId") ?? 1);
  const status = url.searchParams.get("status") ?? "active";
  // scope: "project" (default, back-compat) | "parent" | "all"
  const scopeParam = url.searchParams.get("scope") ?? "project";
  const scope: "project" | "parent" | "all" =
    scopeParam === "parent" || scopeParam === "all" ? scopeParam : "project";

  // Build status predicate (same as before — active means open+fixing).
  const statusPredicate =
    status === "all"
      ? undefined
      : status === "active"
        ? inArray(lintFindings.status, ["open", "fixing"])
        : eq(lintFindings.status, status);

  // Scope predicate — "all" skips filtering.
  const scopePredicate = scope === "all" ? undefined : eq(lintFindings.scope, scope);

  const predicates = [
    eq(lintFindings.projectId, projectId),
    ...(statusPredicate ? [statusPredicate] : []),
    ...(scopePredicate ? [scopePredicate] : []),
  ];
  const where = predicates.length === 1 ? predicates[0] : and(...predicates);

  const findings = db
    .select()
    .from(lintFindings)
    .where(where)
    .orderBy(desc(lintFindings.createdAt))
    .all();

  const latestLintJob = db
    .select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      startedAt: jobs.startedAt,
      completedAt: jobs.completedAt,
    })
    .from(jobs)
    .where(
      and(eq(jobs.projectId, projectId), inArray(jobs.type, ["lint", "fix"]))
    )
    .orderBy(desc(jobs.id))
    .limit(1)
    .all();

  return Response.json({
    findings,
    latestJob: latestLintJob[0] ?? null,
  });
}
