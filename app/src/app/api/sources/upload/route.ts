import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { startJob } from "@/lib/claude-runner";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const RAW_DIR = path.join(process.cwd(), "..", "raw");

function inferType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".html" || ext === ".htm") return "web";
  if (ext === ".md" || ext === ".txt") return "note";
  return "note";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files");

  if (!files.length) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }

  await mkdir(RAW_DIR, { recursive: true });

  const created: Array<{ id: number; title: string; jobId: number }> = [];

  for (const entry of files) {
    if (!(entry instanceof File)) continue;

    const buffer = Buffer.from(await entry.arrayBuffer());
    const filename = entry.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(RAW_DIR, filename);

    await writeFile(filePath, buffer);

    const type = inferType(filename);
    const title = path.basename(filename, path.extname(filename)).replace(/_/g, " ");

    const result = db
      .insert(sources)
      .values({
        projectId: 1,
        title,
        type,
        filePath: `raw/${filename}`,
        status: "ingesting",
      })
      .returning({ id: sources.id })
      .all();

    const sourceId = result[0].id;

    // Auto-start ingestion job
    const projectCwd = path.join(process.cwd(), "..");
    const prompt = `Ingest raw/${filename}`;

    const jobId = await startJob({
      prompt,
      projectCwd,
      projectId: 1,
      type: "ingest",
      title: `Ingest: ${title}`,
    });

    created.push({ id: sourceId, title, jobId });
  }

  return Response.json({ created }, { status: 201 });
}
