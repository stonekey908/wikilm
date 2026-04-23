import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { getProject, projectRoot } from "@/lib/projects";

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

    const project = getProject(source.projectId) ?? getProject(1);
    if (!project) {
      return Response.json({ error: "No project found" }, { status: 404 });
    }

    // Update status to ingesting
    db.update(sources).set({ status: "ingesting" }).where(eq(sources.id, sourceId)).run();

    // Start ingest job
    const { startJob, triggerSynthesisUpdate } = await import("@/lib/claude-runner");
    const projectCwd = projectRoot(project);
    const prompt = `Ingest ${source.filePath}`;

    const jobId = await startJob({
      prompt,
      projectCwd,
      projectId: project.id,
      type: "ingest",
      title: `Ingest: ${source.title}`,
      onComplete: (status) => {
        db.update(sources)
          .set({ status: status === "completed" ? "ingested" : "failed" })
          .where(eq(sources.id, sourceId))
          .run();
        // Approve (from pending) + Retry (from failed) both route here. The
        // upload / upload-md / ingest-web paths trigger synthesis on their own
        // onComplete — this path didn't, so approved-pending notes never
        // refreshed the overview. Trigger is coalesced, so batching N approvals
        // still produces one synthesis at the end.
        if (status === "completed") {
          triggerSynthesisUpdate(projectCwd, project.id).catch((err) => {
            console.error("[synthesis] failed to trigger from approve/retry:", err);
          });
        }
      },
    });

    return Response.json({ jobId });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
