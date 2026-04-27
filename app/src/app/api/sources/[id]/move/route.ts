import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { getProject, projectRoot } from "@/lib/projects";

/**
 * Pure guard used by the POST handler. Extracted for testability — the
 * route itself touches the DB and filesystem, which are awkward to mock
 * in this codebase's pure-function test pattern.
 */
export function isMovableSourceStatus(status: string): boolean {
  return status === "pending";
}

/**
 * POST /api/sources/:id/move
 *
 * Reassign a pending source to a different project. Used by the /sources
 * triage UI when a clipped page lands in the wrong project.
 *
 * Restricted to status = "pending" — moving an *ingested* source would
 * require relocating the wiki pages it produced and rewriting the wikilinks
 * pointing at it, which is a much larger ticket. For ingested sources, the
 * documented workaround is delete + re-clip.
 *
 * Body: { newProjectId: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = parseInt(id, 10);

  if (isNaN(sourceId)) {
    return Response.json({ error: "Invalid source ID" }, { status: 400 });
  }

  let body: { newProjectId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.newProjectId !== "number") {
    return Response.json(
      { error: "newProjectId must be a number" },
      { status: 400 }
    );
  }
  const newProjectId = body.newProjectId;

  const source = db.select().from(sources).where(eq(sources.id, sourceId)).get();
  if (!source) {
    return Response.json({ error: "Source not found" }, { status: 404 });
  }

  if (!isMovableSourceStatus(source.status)) {
    return Response.json(
      {
        error:
          "Move is only supported for pending sources. Delete and re-clip to move an ingested source.",
        code: "not_pending",
      },
      { status: 409 }
    );
  }

  if (source.projectId === newProjectId) {
    return Response.json({ success: true, source }, { status: 200 });
  }

  const oldProject = getProject(source.projectId);
  const newProject = getProject(newProjectId);
  if (!newProject) {
    return Response.json({ error: "Target project not found" }, { status: 404 });
  }

  // File-backed sources have filePath like "raw/<filename>" relative to
  // projectRoot. Web sources store the URL in filePath — no file move needed.
  const isFileBacked = source.filePath.startsWith("raw/");
  if (isFileBacked && oldProject) {
    const oldAbs = path.join(projectRoot(oldProject), source.filePath);
    const newAbs = path.join(projectRoot(newProject), source.filePath);
    if (fs.existsSync(oldAbs)) {
      fs.mkdirSync(path.dirname(newAbs), { recursive: true });
      fs.renameSync(oldAbs, newAbs);
    }
  }

  db.update(sources)
    .set({ projectId: newProjectId })
    .where(eq(sources.id, sourceId))
    .run();

  const updated = db.select().from(sources).where(eq(sources.id, sourceId)).get();
  return Response.json({ success: true, source: updated }, { status: 200 });
}
