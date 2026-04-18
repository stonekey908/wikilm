import { NextRequest } from "next/server";
import path from "path";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startFixJob } from "@/lib/lint";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { findingIds, projectId } = body ?? {};

  if (!Array.isArray(findingIds) || findingIds.length === 0) {
    return Response.json(
      { error: "findingIds must be a non-empty array" },
      { status: 400 }
    );
  }

  const ids = findingIds
    .map((id) => Number(id))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    return Response.json({ error: "No valid finding IDs" }, { status: 400 });
  }

  const projectCwd = path.join(process.cwd(), "..");

  try {
    const jobId = await startFixJob({
      findingIds: ids,
      projectCwd,
      projectId: projectId ?? 1,
    });
    const job = db
      .select({ status: jobs.status, error: jobs.error, errorCode: jobs.errorCode })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .get();
    return Response.json(
      {
        jobId,
        count: ids.length,
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
