import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs, lintFindings } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("projectId") ?? 1);
  const status = url.searchParams.get("status") ?? "active";

  // "active" = open + fixing (the default for the /lint page)
  const where =
    status === "all"
      ? eq(lintFindings.projectId, projectId)
      : status === "active"
        ? and(
            eq(lintFindings.projectId, projectId),
            inArray(lintFindings.status, ["open", "fixing"])
          )
        : and(
            eq(lintFindings.projectId, projectId),
            eq(lintFindings.status, status)
          );

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
