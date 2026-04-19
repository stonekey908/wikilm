import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs, lintFindings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startFixJob } from "@/lib/lint";
import { getProject, projectRoot } from "@/lib/projects";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const findingId = parseInt(id, 10);

  if (isNaN(findingId)) {
    return Response.json({ error: "Invalid finding ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  // Prefer the finding's own projectId — it's the source of truth. Fall back
  // to the body hint, then id=1, so the pre-existing contract still holds if
  // the finding row can't be found.
  const finding = db
    .select({ projectId: lintFindings.projectId })
    .from(lintFindings)
    .where(eq(lintFindings.id, findingId))
    .get();
  const targetProjectId = finding?.projectId ?? body?.projectId ?? 1;
  const project = getProject(targetProjectId) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "No project found" }, { status: 404 });
  }
  const projectCwd = projectRoot(project);

  try {
    const jobId = await startFixJob({
      findingIds: [findingId],
      projectCwd,
      projectId: project.id,
    });
    const job = db
      .select({ status: jobs.status, error: jobs.error, errorCode: jobs.errorCode })
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
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start fix job";
    return Response.json({ error: message }, { status: 400 });
  }
}
