import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startJob, triggerSynthesisUpdate } from "@/lib/claude-runner";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import fs from "fs";

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

const RAW_DIR = path.join(process.cwd(), "..", "raw");

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "note";
}

function uniqueFilename(baseSlug: string): string {
  let candidate = `${baseSlug}.md`;
  let i = 2;
  while (fs.existsSync(path.join(RAW_DIR, candidate))) {
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
  const { title, content } = body ?? {};
  const tags: string[] = Array.isArray(body?.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const projectId = typeof body?.projectId === "number" ? body.projectId : 1;

  if (typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  await mkdir(RAW_DIR, { recursive: true });

  const filename = uniqueFilename(slugify(title));
  const filePath = path.join(RAW_DIR, filename);

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
      status: "ingesting",
    })
    .returning({ id: sources.id })
    .all();

  const sourceId = result[0].id;

  const projectCwd = path.join(process.cwd(), "..");
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

  return Response.json(
    { sourceId, jobId, filePath: `raw/${filename}` },
    { status: 201 }
  );
}
