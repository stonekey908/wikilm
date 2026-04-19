import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startJob, triggerSynthesisUpdate } from "@/lib/claude-runner";
import { getProject, projectRoot } from "@/lib/projects";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, url, domain, author, type, summary, tags, projectId } = body;

  if (!title || !url) {
    return Response.json({ error: "Missing required fields: title, url" }, { status: 400 });
  }

  const targetProjectId = projectId ?? 1;
  const project = getProject(targetProjectId) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "No project found" }, { status: 404 });
  }

  // Create a source record for the web source
  const result = db
    .insert(sources)
    .values({
      projectId: project.id,
      title,
      type: "web",
      filePath: url,
      author: author ?? null,
      meta: JSON.stringify({ domain, summary, tags }),
      status: "ingesting",
    })
    .returning({ id: sources.id })
    .all();

  const sourceId = result[0].id;

  const projectCwd = projectRoot(project);
  const prompt = `Fetch and ingest the following source into the wiki:

Title: ${title}
URL: ${url}
Domain: ${domain ?? ""}
Author: ${author ?? "Unknown"}
Type: ${type ?? "Article"}
Summary: ${summary ?? ""}
Tags: ${(tags ?? []).join(", ")}

Search the web for this source, download or read its content, create a source summary in wiki/sources/, identify entities and concepts, update existing wiki pages with cross-references, and update wiki/index.md and wiki/log.md.`;

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

  return Response.json({ sourceId, jobId }, { status: 201 });
}
