import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getProject, projectRoot } from "@/lib/projects";

/**
 * DELETE /api/projects/:id/outputs/delete?baseSlug=<slug>
 *
 * Removes every file in `wiki/outputs/` whose basename starts with
 * `<baseSlug>.`. That covers the primary artifact (.md or .html) plus every
 * derived format (.docx, .pdf, .pptx, .png) and any companion .md stub.
 *
 * Returns `{ deleted: [<basename>, ...] }` so the UI can toast what went.
 *
 * The baseSlug is validated against a narrow whitelist (lowercase, digits,
 * hyphens, dots) to keep the attack surface small — no traversal possible.
 */
export async function DELETE(
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

  const baseSlug = request.nextUrl.searchParams.get("baseSlug") ?? "";
  if (!baseSlug || !/^[a-z0-9][a-z0-9.\-]*$/i.test(baseSlug)) {
    return Response.json({ error: "Invalid baseSlug" }, { status: 400 });
  }

  const outputsDir = path.join(projectRoot(project), "wiki", "outputs");
  if (!fs.existsSync(outputsDir)) {
    return Response.json({ deleted: [] });
  }

  const entries = fs.readdirSync(outputsDir);
  const matches = entries.filter((name) => name.startsWith(`${baseSlug}.`));
  const deleted: string[] = [];
  for (const name of matches) {
    const abs = path.join(outputsDir, name);
    try {
      fs.unlinkSync(abs);
      deleted.push(name);
    } catch (err) {
      console.error(`[outputs] failed to delete ${abs}:`, err);
    }
  }

  return Response.json({ deleted });
}
