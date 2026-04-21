import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { lintFindings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProject, hasChildren, projectRoot, slugifyName, wikiDir } from "@/lib/projects";
import { startJob } from "@/lib/claude-runner";

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

  // Concept scaffolding was originally parent-only; we've relaxed it so
  // individual projects can scaffold concepts too — the fill job reads
  // whatever wiki is at `projectCwd` and works with that.
  void hasChildren;

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

  // Fire a concept-fill job: Claude reads the wiki + evidencing pages and
  // replaces the placeholder with a real TL;DR + Notes. The job runs under
  // the `concept-fill` model setting (see /settings → Concept drafting).
  let jobId: number | null = null;
  try {
    const evidenceNote =
      evidencingSlugs.length > 0
        ? `The user flagged these pages as evidencing this concept — read them first to ground your draft:\n${evidencingSlugs.map((s) => `- [[${s}]]`).join("\n")}\n\n`
        : "";
    const prompt = `You are drafting a concept page for the WikiLM wiki.

**Concept title:** ${title.trim()}

**Target file:** \`wiki/concepts/${slug}.md\` (already scaffolded — overwrite in place).

${evidenceNote}Steps:
1. Read \`wiki/index.md\` to orient yourself in the project.
2. Walk the wiki looking for every page that already references "${title.trim()}" (or close variants). Those are your source material.
3. Rewrite \`wiki/concepts/${slug}.md\` with this structure:
   - Keep the existing frontmatter (\`type: concept\`). Add a \`tags:\` array with 3–5 relevant tags drawn from referring pages.
   - \`# ${title.trim()}\`
   - A **one-paragraph TL;DR** (3–5 sentences) that defines the concept in the user's voice — not an encyclopedia entry.
   - A \`## Why it matters\` section explaining why this concept earned its own page (why we pulled it out, not just what it is).
   - A \`## Evidence\` section listing the referring pages as \`- [[wikilink]] — <one-line gloss of what that page says about this concept>\`.
   - A \`## Connections\` section listing 3–7 related concept/entity pages already in the wiki, each as \`- [[page]] — <one-line relation>\`. Prefer pages that already exist.
   - A \`## Open questions\` section with 2–4 bullets of genuinely unresolved aspects — not rhetorical framing.

**Constraints:**
- Every \`[[wikilink]]\` must point at an existing page (check before writing — use the slug exactly as it appears on disk).
- Do not invent claims. Every specific statement is backed by an evidencing page.
- Do not touch any file other than \`wiki/concepts/${slug}.md\`.
- Append one line to \`wiki/log.md\`: \`## [${today}] update | Filled concept: ${slug}\`.`;

    jobId = await startJob({
      prompt,
      projectCwd: projectRoot(project),
      projectId: project.id,
      type: "concept-fill",
      title: `Fill concept: ${title.trim()}`,
    });
  } catch (err) {
    console.error("[concept-scaffold] couldn't queue fill job:", err);
  }

  return Response.json(
    {
      success: true,
      projectId: project.id,
      projectSlug: project.slug,
      slug,
      filePath: `concepts/${slug}.md`,
      fillJobId: jobId,
    },
    { status: 201 }
  );
}
