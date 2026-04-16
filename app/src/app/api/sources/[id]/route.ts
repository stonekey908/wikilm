import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function DELETE(
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

  // Delete the raw file if it exists
  const rawPath = path.join(process.cwd(), "..", source.filePath);
  if (fs.existsSync(rawPath)) {
    fs.unlinkSync(rawPath);
  }

  // Delete from DB
  db.delete(sources).where(eq(sources.id, sourceId)).run();

  return Response.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = parseInt(id, 10);
  const body = await request.json();

  if (isNaN(sourceId)) {
    return Response.json({ error: "Invalid source ID" }, { status: 400 });
  }

  // Trigger ingest for a pending source
  if (body.action === "ingest") {
    const source = db.select().from(sources).where(eq(sources.id, sourceId)).get();
    if (!source) {
      return Response.json({ error: "Source not found" }, { status: 404 });
    }

    // Update status to ingesting
    db.update(sources).set({ status: "ingesting" }).where(eq(sources.id, sourceId)).run();

    // Start ingest job
    const { startJob } = await import("@/lib/claude-runner");
    const projectCwd = path.join(process.cwd(), "..");
    const prompt = `Ingest ${source.filePath}`;

    const jobId = await startJob({
      prompt,
      projectCwd,
      projectId: source.projectId,
      type: "ingest",
      title: `Ingest: ${source.title}`,
    });

    return Response.json({ jobId });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
