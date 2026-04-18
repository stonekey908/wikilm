import { NextRequest } from "next/server";
import { MoveProjectError, moveProject } from "@/lib/projects";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id, 10);

  if (isNaN(projectId)) {
    return Response.json({ error: "Invalid project ID" }, { status: 400 });
  }

  let body: { newParentId?: number | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const newParentId =
    body.newParentId === undefined ? null : body.newParentId;

  if (newParentId !== null && typeof newParentId !== "number") {
    return Response.json(
      { error: "newParentId must be a number or null" },
      { status: 400 }
    );
  }

  try {
    const updated = moveProject(projectId, newParentId);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof MoveProjectError) {
      const status =
        e.code === "not_found"
          ? 404
          : e.code === "collision" || e.code === "cycle"
          ? 409
          : 400;
      return Response.json({ error: e.message, code: e.code }, { status });
    }
    return Response.json(
      { error: (e as Error).message ?? "Internal error" },
      { status: 500 }
    );
  }
}
