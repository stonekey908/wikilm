import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getProject, projectRoot } from "@/lib/projects";

/**
 * GET /api/projects/:id/outputs/download?file=<basename>.<ext>
 *
 * Serves a single file from the project's wiki/outputs/ directory.
 * The `file` parameter is the basename (no subdirs) to keep the attack
 * surface tiny — we refuse anything with a slash or leading dot so it
 * can't escape the outputs/ directory.
 */
const ALLOWED_EXTENSIONS = new Set([
  "md",
  "docx",
  "pdf",
  "pptx",
  "html",
  "png",
]);

const CONTENT_TYPES: Record<string, string> = {
  md: "text/markdown; charset=utf-8",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  html: "text/html; charset=utf-8",
  png: "image/png",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }
  const project = getProject(projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const file = request.nextUrl.searchParams.get("file") ?? "";
  if (!file || file.includes("/") || file.includes("\\") || file.startsWith(".")) {
    return Response.json({ error: "Invalid file param" }, { status: 400 });
  }

  const ext = path.extname(file).slice(1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return Response.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const abs = path.join(projectRoot(project), "wiki", "outputs", file);
  if (!fs.existsSync(abs)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  // Extra belt-and-braces: make sure the resolved abs path really sits under
  // the project's outputs directory. Defeats tricksy cased/encoded traversals.
  const outputsRoot = path.join(projectRoot(project), "wiki", "outputs");
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(path.resolve(outputsRoot) + path.sep)) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  const buffer = fs.readFileSync(abs);
  const disposition = request.nextUrl.searchParams.get("download") === "1"
    ? `attachment; filename="${file}"`
    : `inline; filename="${file}"`;

  // Cast to Uint8Array so Response accepts it directly (Buffer is a subclass
  // but the Web Response type predates Node's Buffer).
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return new Response(bytes, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext],
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}
