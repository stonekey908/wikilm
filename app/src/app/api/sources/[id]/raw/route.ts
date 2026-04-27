import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { getProject, projectRoot } from "@/lib/projects";

/**
 * GET /api/sources/:id/raw
 *
 * Returns the raw content of a source — used by the /sources Preview modal
 * to show the user what was actually captured before they Approve / Move /
 * Delete a pending source.
 *
 * For file-backed sources (note, pdf, markdown clips), returns the raw
 * file contents as plain text.
 * For web sources without a local file (URL-only ingest-web entries),
 * returns a JSON stub with the URL + meta so the modal can render a
 * "no local content — open the source page" view.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = parseInt(id, 10);

  if (isNaN(sourceId)) {
    return Response.json({ error: "Invalid source ID" }, { status: 400 });
  }

  const source = db.select().from(sources).where(eq(sources.id, sourceId)).get();
  if (!source) {
    return Response.json({ error: "Source not found" }, { status: 404 });
  }

  const isFileBacked = source.filePath.startsWith("raw/");
  if (!isFileBacked) {
    return Response.json({
      kind: "external",
      url: source.filePath,
      title: source.title,
      meta: source.meta,
    });
  }

  const project = getProject(source.projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const abs = path.join(projectRoot(project), source.filePath);
  if (!fs.existsSync(abs)) {
    return Response.json(
      { error: "Raw file is missing on disk", filePath: source.filePath },
      { status: 410 }
    );
  }

  const content = fs.readFileSync(abs, "utf-8");
  return Response.json({
    kind: "file",
    filePath: source.filePath,
    title: source.title,
    content,
  });
}
