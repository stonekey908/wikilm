import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import fs from "fs";
import { getProject, projectRoot } from "@/lib/projects";
import { htmlToMarkdown } from "@/lib/clip-to-markdown";
import { corsPreflight } from "@/lib/cors";

/**
 * POST /api/clip — bookmarklet form-submission target
 *
 * The Safari-bookmarklet path POSTs a form here with `html`, `url`, and
 * `title` fields. We run the HTML through Turndown server-side (no web
 * grounding needed — the bookmarklet captured the page as the user sees
 * it), write a pending source row in the user's default project, and
 * 303-redirect to `/clip?id=<sourceId>` so the user can re-pick the
 * destination project from a real picker UI.
 *
 * Form POST avoids the Safari URL-mangling problem that broke the
 * earlier in-page bookmarklet (STO-1960).
 */

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "clip"
  );
}

function uniqueFilename(rawDir: string, baseSlug: string): string {
  let candidate = `${baseSlug}.md`;
  let i = 2;
  while (fs.existsSync(path.join(rawDir, candidate))) {
    candidate = `${baseSlug}-${i}.md`;
    i++;
  }
  return candidate;
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const html = (formData.get("html") as string | null) ?? "";
  const title = ((formData.get("title") as string | null) ?? "Untitled clip").trim();
  const url = ((formData.get("url") as string | null) ?? "").trim();

  if (!html.trim()) {
    return Response.json(
      { error: "Missing required field: html" },
      { status: 400 }
    );
  }

  // Default project = id 1 (user can re-pick on the success page).
  const project = getProject(1);
  if (!project) {
    return Response.json({ error: "No default project (id 1) found" }, { status: 500 });
  }

  const projectCwd = projectRoot(project);
  const rawDir = path.join(projectCwd, "raw");
  await mkdir(rawDir, { recursive: true });

  const filename = uniqueFilename(rawDir, slugify(title));
  const filePath = path.join(rawDir, filename);

  const md = htmlToMarkdown(html);
  const header = url ? `# ${title}\n\n> Source: ${url}\n\n` : `# ${title}\n\n`;
  await writeFile(filePath, header + md, "utf-8");

  const result = db
    .insert(sources)
    .values({
      projectId: project.id,
      title,
      type: "note",
      filePath: `raw/${filename}`,
      meta: JSON.stringify({ clipper: true, sourceUrl: url }),
      status: "pending",
    })
    .returning({ id: sources.id })
    .all();

  const sourceId = result[0].id;

  // 303 redirect to the success/picker page so the bookmarklet's new tab
  // lands somewhere useful instead of showing JSON.
  return Response.redirect(new URL(`/clip?id=${sourceId}`, request.url), 303);
}
