import { NextRequest } from "next/server";
import path from "path";
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
    return Response.json({ jobId, count: ids.length }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start fix job";
    return Response.json({ error: message }, { status: 400 });
  }
}
