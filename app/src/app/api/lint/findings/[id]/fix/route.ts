import { NextRequest } from "next/server";
import path from "path";
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
    return Response.json({ jobId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start fix job";
    return Response.json({ error: message }, { status: 400 });
  }
}
