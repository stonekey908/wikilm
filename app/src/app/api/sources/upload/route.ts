import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startJob, triggerSynthesisUpdate } from "@/lib/claude-runner";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { getProject, projectRoot } from "@/lib/projects";

const RAW_DIR = path.join(process.cwd(), "..", "raw");

function inferType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".html" || ext === ".htm") return "web";
  if (ext === ".md" || ext === ".txt") return "note";
  return "note";
}

/**
 * Pull `title:` from YAML frontmatter, if present.
 * Returns null if the file doesn't start with a frontmatter block.
 */
function extractFrontmatterTitle(content: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  for (const line of match[1].split("\n")) {
    const m = line.match(/^title:\s*(.+?)\s*$/);
    if (m) {
      return m[1].replace(/^["']|["']$/g, "").trim() || null;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files");

  if (!files.length) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }

  const projectIdRaw = formData.get("projectId");
  const parsedProjectId =
    typeof projectIdRaw === "string" ? Number(projectIdRaw) : NaN;
  const targetProjectId = Number.isFinite(parsedProjectId) ? parsedProjectId : 1;
  const project = getProject(targetProjectId) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "No project found" }, { status: 404 });
  }
  const projectCwd = projectRoot(project);

  await mkdir(RAW_DIR, { recursive: true });

  const created: Array<{ id: number; title: string; jobId: number }> = [];

  for (const entry of files) {
    if (!(entry instanceof File)) continue;

    const buffer = Buffer.from(await entry.arrayBuffer());
    const filename = entry.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(RAW_DIR, filename);

    await writeFile(filePath, buffer);

    const type = inferType(filename);
    const ext = path.extname(filename).toLowerCase();
    let title = path.basename(filename, path.extname(filename)).replace(/_/g, " ");
    // Prefer the frontmatter title for markdown uploads — gives nicer labels
    // than a sanitised filename (e.g. "Digital twin patterns" vs "digital_twin_patterns").
    if (ext === ".md") {
      const fmTitle = extractFrontmatterTitle(buffer.toString("utf-8"));
      if (fmTitle) title = fmTitle;
    }

    const result = db
      .insert(sources)
      .values({
        projectId: project.id,
        title,
        type,
        filePath: `raw/${filename}`,
        status: "ingesting",
      })
      .returning({ id: sources.id })
      .all();

    const sourceId = result[0].id;

    // Auto-start ingestion job
    const prompt = `Ingest raw/${filename}`;

    const jobId = await startJob({
      prompt,
      projectCwd,
      projectId: project.id,
      type: "ingest",
      title: `Ingest: ${title}`,
      onComplete: (status) => {
        db.update(sources)
          .set({ status: status === "completed" ? "ingested" : "failed" })
          .where(eq(sources.id, sourceId))
          .run();
        if (status === "completed") {
          triggerSynthesisUpdate(projectCwd, project.id).catch((err) => {
            console.error("[synthesis] failed to trigger:", err);
          });
        }
      },
    });

    created.push({ id: sourceId, title, jobId });
  }

  return Response.json({ created }, { status: 201 });
}
