import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { sources, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startJob, triggerSynthesisUpdate } from "@/lib/claude-runner";
import {
  getProject,
  projectRoot,
  wikiDir,
  type Project,
} from "@/lib/projects";
import { getAllMdFiles } from "@/lib/wiki-utils";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * For an ingest target, list the slugs of entity + concept pages that already
 * exist in the current project + its parent + its siblings, so the ingest
 * prompt can reference them via `[[project-slug/page]]` instead of creating
 * duplicates. Keeps the list small (scoped to entity/concept, not all pages)
 * so the prompt stays readable.
 */
function relatedExistingPages(project: Project): Array<{
  projectSlug: string;
  kind: "entities" | "concepts";
  pageSlug: string;
}> {
  const toScan: Project[] = [project];
  if (project.parentId != null) {
    const parent = getProject(project.parentId);
    if (parent) {
      toScan.push(parent);
      // siblings — other children of the same parent
      const siblings = db
        .select()
        .from(projects)
        .where(eq(projects.parentId, parent.id))
        .all();
      for (const s of siblings) {
        if (s.id !== project.id) toScan.push(s);
      }
    }
  }
  const out: Array<{ projectSlug: string; kind: "entities" | "concepts"; pageSlug: string }> = [];
  for (const p of toScan) {
    for (const kind of ["entities", "concepts"] as const) {
      const dir = path.join(wikiDir(p), kind);
      if (!fs.existsSync(dir)) continue;
      for (const f of getAllMdFiles(dir)) {
        const rel = path.relative(dir, f).replace(/\.md$/, "").replace(/\\/g, "/");
        out.push({ projectSlug: p.slug, kind, pageSlug: rel });
      }
    }
  }
  return out;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, url, domain, author, type, summary, tags, projectId } = body;
  // Opt-in defer: clipper-style callers pass `defer: true` so the source
  // lands as pending in the library; the user later triages and approves
  // from /sources. Default stays "ingest now" so the existing "Commission →"
  // UI flow on /sources is unchanged.
  const defer = body?.defer === true;

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
      status: defer ? "pending" : "ingesting",
    })
    .returning({ id: sources.id })
    .all();

  const sourceId = result[0].id;

  if (defer) {
    return withCors(
      Response.json({ sourceId, status: "pending" }, { status: 201 })
    );
  }

  const projectCwd = projectRoot(project);

  // Build a "already exists — prefer cross-project link over duplicate" list
  // to cure the STO-1765 finding that ingest silently duplicates entity pages
  // (e.g. both `ai/wiki/entities/openai.md` and `ai/llms/wiki/entities/openai.md`).
  const existing = relatedExistingPages(project);
  const existingBlock =
    existing.length > 0
      ? `\n\n## Pages that already exist in this project tree\n\nPrefer cross-project wikilinks to any of these over creating a duplicate page in THIS project. Cross-project link syntax: \`[[<project-slug>/<path>]]\`.\n\n${existing
          .map((e) => `- \`[[${e.projectSlug}/${e.kind}/${e.pageSlug}]]\``)
          .join("\n")}`
      : "";

  const prompt = `Fetch and ingest the following source into the wiki:

Title: ${title}
URL: ${url}
Domain: ${domain ?? ""}
Author: ${author ?? "Unknown"}
Type: ${type ?? "Article"}
Summary: ${summary ?? ""}
Tags: ${(tags ?? []).join(", ")}

Search the web for this source, download or read its content, create a source summary in wiki/sources/, identify entities and concepts, update existing wiki pages with cross-references, and update wiki/index.md and wiki/log.md.

## Wikilink discipline (STO-1765)

Every \`[[wikilink]]\` you write MUST point at a page that will exist in the wiki after this ingest completes. Two options for any entity or concept you mention:

1. **Create its page** — if the entity or concept is worth naming, file a real page for it under \`wiki/entities/<slug>.md\` or \`wiki/concepts/<slug>.md\` with frontmatter, and \`[[wikilink]]\` it.
2. **Don't wikilink it** — if the mention is incidental and not worth a page, use **bold** or plain text instead of \`[[brackets]]\`. Do NOT leave dangling wikilinks to pages you didn't create.

No half-measures: every \`[[x]]\` must resolve after this ingest.${existingBlock}`;

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

  return withCors(Response.json({ sourceId, jobId }, { status: 201 }));
}
