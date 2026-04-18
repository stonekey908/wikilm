import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProject, hasChildren, projectRoot } from "@/lib/projects";
import { startParentLintJob } from "@/lib/lint";

/**
 * POST /api/lint/parent-run/:projectId
 *
 * Kicks off a parent-level lint pass that reads children's syntheses and
 * surfaces cross-cutting findings (promotion candidates, recurring themes,
 * parent-level gaps). Findings land in lint_findings with scope="parent"
 * — retrievable via GET /api/lint/findings?projectId=<id>&scope=parent.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: raw } = await params;
  const projectId = parseInt(raw, 10);

  if (isNaN(projectId)) {
    return Response.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = getProject(projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (!hasChildren(projectId)) {
    return Response.json(
      { error: "Not a parent project" },
      { status: 400 }
    );
  }

  const cwd = projectRoot(project);

  try {
    const jobId = await startParentLintJob({ projectCwd: cwd, projectId });
    const job = db
      .select({
        status: jobs.status,
        error: jobs.error,
        errorCode: jobs.errorCode,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .get();
    return Response.json(
      {
        jobId,
        status: job?.status ?? "unknown",
        error: job?.error ?? null,
        errorCode: job?.errorCode ?? null,
      },
      { status: 202 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start parent lint job";
    return Response.json({ error: message }, { status: 429 });
  }
}
