import { NextRequest } from "next/server";
import { getProject, projectRoot } from "@/lib/projects";
import { triggerSynthesisUpdate } from "@/lib/claude-runner";

/**
 * POST /api/projects/:id/synthesis/run
 *
 * On-demand synthesis trigger for a single (leaf) project. Used by the
 * Map's constellation empty-state CTA when a project has wiki pages but
 * no synthesis to anchor the view. Coalesces via triggerSynthesisUpdate's
 * pending flag — the actual run is deferred until the job queue is idle.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id, 10);

  if (isNaN(projectId)) {
    return Response.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = getProject(projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const cwd = projectRoot(project);
  await triggerSynthesisUpdate(cwd, projectId);
  return Response.json({ status: "queued" }, { status: 202 });
}
