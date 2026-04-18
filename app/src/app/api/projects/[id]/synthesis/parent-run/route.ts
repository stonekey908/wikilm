import { NextRequest } from "next/server";
import { getProject, hasChildren, projectRoot } from "@/lib/projects";
import { triggerParentSynthesisUpdate } from "@/lib/claude-runner";

/**
 * POST /api/projects/:id/synthesis/parent-run
 *
 * On-demand parent-level synthesis trigger. Rejects projects with no
 * children (there's nothing to synthesize across). Coalesces via
 * triggerParentSynthesisUpdate's in-flight/pending flags — rapid clicks
 * produce at most 2 runs.
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

  if (!hasChildren(projectId)) {
    return Response.json(
      { error: "Not a parent project" },
      { status: 400 }
    );
  }

  const cwd = projectRoot(project);
  const jobId = await triggerParentSynthesisUpdate(cwd, projectId);
  // null jobId = coalesced into an already-in-flight run; still treat as
  // "queued" from the client's perspective — the work will happen.
  return Response.json({ status: "queued", jobId }, { status: 202 });
}
