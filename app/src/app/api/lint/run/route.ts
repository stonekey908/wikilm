import { NextRequest } from "next/server";
import path from "path";
import { startLintJob } from "@/lib/lint";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectId = body?.projectId ?? 1;

  const projectCwd = path.join(process.cwd(), "..");

  try {
    const jobId = await startLintJob({ projectCwd, projectId });
    return Response.json({ jobId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start lint job";
    return Response.json({ error: message }, { status: 429 });
  }
}
