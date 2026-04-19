import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startLintJob } from "@/lib/lint";
import { getProject, projectRoot } from "@/lib/projects";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectIdParam = body?.projectId ?? 1;
  const project = getProject(projectIdParam) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "No project found" }, { status: 404 });
  }
  const projectId = project.id;
  const projectCwd = projectRoot(project);

  try {
    const jobId = await startLintJob({ projectCwd, projectId });
    // Return the job's initial state — if pre-flight failed, the row is
    // already status="failed" with a classified errorCode, and the UI
    // branches on that rather than showing a misleading "started" toast.
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
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start lint job";
    return Response.json({ error: message }, { status: 429 });
  }
}
