import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { lintFindings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProject, hasChildren, slugifyName, wikiDir } from "@/lib/projects";

/**
 * POST /api/wiki/concept-scaffold
 * Body: { findingId, projectId, title, evidencingSlugs: string[] }
 *
 * Creates a placeholder concept page at
 *   <projectWiki>/concepts/<slugify(title)>.md
 * with YAML frontmatter (type: concept), a heading, a TL;DR placeholder,
 * and a bulleted list of `[[evidencingSlug]]` wikilinks.
 *
 * The owning project must be a parent (has children) — scaffolding at a
 * leaf project isn't wrong but it's not the flow this endpoint exists for.
 * On success, marks the finding as resolved.
 */
export async function POST(request: NextRequest) {
  let body: {
    findingId?: number;
    projectId?: number;
    title?: string;
    evidencingSlugs?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { findingId, projectId, title } = body;
  const evidencingSlugs = Array.isArray(body.evidencingSlugs)
    ? body.evidencingSlugs.filter((s) => typeof s === "string" && s.length > 0)
    : [];

  if (
    typeof findingId !== "number" ||
    typeof projectId !== "number" ||
    typeof title !== "string" ||
    !title.trim()
  ) {
    return Response.json(
      {
        error:
          "findingId (number), projectId (number), title (non-empty string) are required",
      },
      { status: 400 }
    );
  }

  const project = getProject(projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (!hasChildren(projectId)) {
    return Response.json(
      { error: "Concept scaffolding targets parent projects only" },
      { status: 400 }
    );
  }

  const slug = slugifyName(title);
  if (!slug) {
    return Response.json({ error: "Title did not produce a valid slug" }, { status: 400 });
  }

  const wiki = wikiDir(project);
  const conceptsDir = path.join(wiki, "concepts");
  const filePath = path.join(conceptsDir, `${slug}.md`);

  if (fs.existsSync(filePath)) {
    return Response.json(
      {
        error: `A concept page already exists at concepts/${slug}.md — pick a different title or edit the existing page.`,
      },
      { status: 409 }
    );
  }

  fs.mkdirSync(conceptsDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const evidenceLines =
    evidencingSlugs.length > 0
      ? evidencingSlugs.map((s) => `- [[${s}]]`).join("\n")
      : "- _(add links to sources / entities / pages that evidence this concept)_";

  const content = `---
type: concept
tags: []
created: ${today}
---

# ${title.trim()}

_TL;DR: (placeholder — replace with a one-paragraph summary of this concept.)_

## Evidence

${evidenceLines}

## Notes

_(placeholder — flesh out what we know, open questions, and how this relates to other wiki pages.)_
`;

  fs.writeFileSync(filePath, content);

  // Mark the nudge resolved (best-effort).
  db.update(lintFindings)
    .set({ status: "resolved", updatedAt: new Date().toISOString() })
    .where(eq(lintFindings.id, findingId))
    .run();

  return Response.json(
    {
      success: true,
      projectId: project.id,
      projectSlug: project.slug,
      slug,
      filePath: `concepts/${slug}.md`,
    },
    { status: 201 }
  );
}
