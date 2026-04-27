import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startJob, triggerSynthesisUpdate } from "@/lib/claude-runner";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import fs from "fs";
import { getProject, projectRoot } from "@/lib/projects";
import { corsPreflight, withCors } from "@/lib/cors";
import { htmlToMarkdown } from "@/lib/clip-to-markdown";

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Programmatic markdown upload.
 *
 * POST body:
 *   {
 *     title:     string            // required — becomes the source title
 *     content:   string            // required — the markdown body
 *     tags?:     string[]          // optional — prepended as frontmatter
 *     projectId?: number           // optional — defaults to 1
 *   }
 *
 * Writes raw/<slug>.md, inserts a source row, kicks off ingest.
 * Used by the MCP server's `save_learning` tool and by any other
 * programmatic client (curl, scripts). The UI continues to use the
 * multipart /api/sources/upload endpoint.
 */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "note";
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

function hasFrontmatter(content: string): boolean {
  return /^---\r?\n/.test(content);
}

function buildFrontmatter(title: string, tags: string[]): string {
  const lines = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: "${new Date().toISOString().slice(0, 10)}"`,
  ];
  if (tags.length > 0) {
    lines.push(`tags: [${tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { title } = body ?? {};
  const tags: string[] = Array.isArray(body?.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const projectIdInput = typeof body?.projectId === "number" ? body.projectId : 1;
  // Per STO-1743 design Q6: default behavior is PENDING — the raw file + source
  // row land immediately, and the user manually triggers ingest from /sources.
  // Callers opt in to immediate ingest with `ingest: true` (used by UI flows
  // that want the "upload + ingest now" experience).
  const ingestNow = body?.ingest === true;

  // Clipper-style callers send `html` (the page DOM) + `url` (the source
  // page); MCP / programmatic callers send `content` (already-markdown).
  // When html is provided we run it through Turndown and prepend a small
  // source-attribution header so the ingest knows where the page came from.
  let content: string;
  if (typeof body?.html === "string" && body.html.trim()) {
    const sourceUrl = typeof body?.url === "string" ? body.url : "";
    const md = htmlToMarkdown(body.html);
    const header = sourceUrl
      ? `# ${typeof title === "string" ? title : ""}\n\n> Source: ${sourceUrl}\n\n`
      : `# ${typeof title === "string" ? title : ""}\n\n`;
    content = header + md;
  } else if (typeof body?.content === "string" && body.content.trim()) {
    content = body.content;
  } else {
    return Response.json(
      { error: "Either `html` or `content` is required" },
      { status: 400 }
    );
  }

  if (typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const project = getProject(projectIdInput) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "No project found" }, { status: 404 });
  }
  const projectId = project.id;
  const projectCwd = projectRoot(project);
  // Per-project raw dir so markdown lives alongside the project's wiki
  // instead of polluting the top-level raw/ (which was the previous
  // behavior and would orphan files for nested projects on ingest).
  const rawDir = path.join(projectCwd, "raw");

  await mkdir(rawDir, { recursive: true });

  const filename = uniqueFilename(rawDir, slugify(title));
  const filePath = path.join(rawDir, filename);

  // If the caller didn't include frontmatter, prepend one so downstream ingest
  // has consistent metadata to work with.
  const finalContent = hasFrontmatter(content)
    ? content
    : buildFrontmatter(title, tags) + content;

  await writeFile(filePath, finalContent, "utf-8");

  const result = db
    .insert(sources)
    .values({
      projectId,
      title,
      type: "note",
      filePath: `raw/${filename}`,
      meta: JSON.stringify({ tags, programmatic: true }),
      status: ingestNow ? "ingesting" : "pending",
    })
    .returning({ id: sources.id })
    .all();

  const sourceId = result[0].id;

  if (!ingestNow) {
    // Pending path — just captured, not yet ingested. User curates from
    // /sources (Ingest / Edit / Discard actions).
    return withCors(
      Response.json(
        { sourceId, status: "pending", filePath: `raw/${filename}` },
        { status: 201 }
      )
    );
  }

  const prompt = `Ingest raw/${filename}`;

  const jobId = await startJob({
    prompt,
    projectCwd,
    projectId,
    type: "ingest",
    title: `Ingest: ${title}`,
    onComplete: (status) => {
      db.update(sources)
        .set({ status: status === "completed" ? "ingested" : "failed" })
        .where(eq(sources.id, sourceId))
        .run();
      if (status === "completed") {
        triggerSynthesisUpdate(projectCwd, projectId).catch((err) => {
          console.error("[synthesis] failed to trigger:", err);
        });
      }
    },
  });

  return withCors(
    Response.json(
      { sourceId, jobId, status: "ingesting", filePath: `raw/${filename}` },
      { status: 201 }
    )
  );
}
