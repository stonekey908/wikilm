import { NextRequest } from "next/server";
import { cancelJob } from "@/lib/claude-runner";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobId = parseInt(id, 10);

  if (isNaN(jobId)) {
    return Response.json({ error: "Invalid job ID" }, { status: 400 });
  }

  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json(job);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobId = parseInt(id, 10);

  if (isNaN(jobId)) {
    return Response.json({ error: "Invalid job ID" }, { status: 400 });
  }

  const cancelled = cancelJob(jobId);

  if (!cancelled) {
    return Response.json(
      { error: "Job not found or not running" },
      { status: 404 }
    );
  }

  return Response.json({ success: true });
}
