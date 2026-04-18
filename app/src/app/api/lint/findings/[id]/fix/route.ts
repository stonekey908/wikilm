import { NextRequest } from "next/server";
import path from "path";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startFixJob } from "@/lib/lint";

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
  const projectId = body?.projectId ?? 1;
  const projectCwd = path.join(process.cwd(), "..");

  try {
    const jobId = await startFixJob({
      findingIds: [findingId],
      projectCwd,
      projectId,
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
