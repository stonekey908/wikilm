import { NextRequest } from "next/server";
import path from "path";
import { startJob, getRunningJobCount } from "@/lib/claude-runner";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, projectId, type, title } = body;

  if (!prompt || !projectId || !type || !title) {
    return Response.json(
      { error: "Missing required fields: prompt, projectId, type, title" },
      { status: 400 }
    );
  }

  // Resolve project root server-side
  const projectCwd = path.join(process.cwd(), "..");

  try {
    const jobId = await startJob({ prompt, projectCwd, projectId, type, title });
    return Response.json({ jobId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start job";
    return Response.json({ error: message }, { status: 429 });
  }
}

export async function GET() {
  const allJobs = db
    .select()
    .from(jobs)
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .all();

  return Response.json({ jobs: allJobs, runningCount: getRunningJobCount() });
}
