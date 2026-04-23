import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { getProject, projectRoot, wikiDir } from "@/lib/projects";
import { startJob } from "@/lib/claude-runner";

/**
 * POST /api/queries/from-trail
 *
 * Body: { projectId, trail: [{ slug, title, type }, ...] }
 *
 * Synthesises a Map-trail (the user's wandering path) into a query page.
 * Spawns a Claude subprocess that reads each stop's markdown body and
 * writes a tied-together narrative to `wiki/queries/{slug}.md`. Returns
 * { jobId, queryRelPath } immediately; the client polls /api/claude/job/:id.
 */

interface TrailStop {
  slug: string;
  title: string;
  type: string;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "trail-query"
  );
}

function buildTrailPrompt(
  trail: TrailStop[],
  queryRelPath: string,
  dateIso: string,
  question: string,
): string {
  const stops = trail
    .map((s, i) => `${i + 1}. **${s.title}** (${s.type}) — \`wiki/${s.slug}.md\``)
    .join("\n");

  return [
    `Synthesise a query page from a Map-trail and write it to \`${queryRelPath}\`.`,
    "",
    "The user wandered through these wiki pages, in this order, by clicking through the graph:",
    "",
    stops,
    "",
    "**Read each page in order**, then write the file with this exact structure:",
    "",
    "```",
    "---",
    "type: query",
    `question: "${question.replace(/"/g, '\\"')}"`,
    `date: "${dateIso}"`,
    "tags: [trail, <2-4 more kebab-case tags drawn from the pages>]",
    "---",
    "",
    "# <a one-phrase title that captures the through-line of the trail>",
    "",
    "## The trail",
    "",
    "<one paragraph naming the stops in order and what carried the user from each to the next — the *connective tissue* between the pages, not a recap of each page>",
    "",
    "## What the wiki says",
    "",
    "<2–4 paragraphs synthesising the through-line. Cite specific claims from the pages with `[[wikilink]]` references — every claim should be traceable. Do not paraphrase whole pages; pick the parts that connect.>",
    "",
    "## Open threads",
    "",
    "- <bulleted list of questions or tensions the trail surfaced but did not resolve>",
    "```",
    "",
    "**Rules:**",
    "- Use `[[wikilink]]` syntax for every reference back to a page.",
    "- Stay grounded in what the pages actually say — do not invent facts.",
    "- Treat the trail as evidence of what the user is *thinking about*; the question above is your interpretation of that intent.",
    "- Do not add commentary outside the file. Write the file and stop.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectIdInput = typeof body?.projectId === "number" ? body.projectId : null;
  const trail: TrailStop[] = Array.isArray(body?.trail) ? body.trail : [];

  if (projectIdInput === null) {
    return Response.json({ error: "projectId required" }, { status: 400 });
  }
  if (trail.length < 2) {
    return Response.json(
      { error: "Trail needs at least 2 stops to synthesise" },
      { status: 400 },
    );
  }

  const project = getProject(projectIdInput);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const projectCwd = projectRoot(project);
  const wikiPath = wikiDir(project);
  const queryDir = path.join(wikiPath, "queries");
  fs.mkdirSync(queryDir, { recursive: true });

  // Filename: date + first stop's slug + "to" + last stop's slug, truncated.
  const dateIso = new Date().toISOString().slice(0, 10);
  const hhmm = new Date().toISOString().slice(11, 16).replace(":", "");
  const firstTitle = trail[0]?.title ?? "trail";
  const lastTitle = trail[trail.length - 1]?.title ?? "end";
  const slugBase = slugify(`${firstTitle}-to-${lastTitle}`);
  const filename = `trail-${dateIso}-${hhmm}-${slugBase}.md`;
  const queryRelPath = `wiki/queries/${filename}`;

  // The "question" the trail represents — generated from the path itself.
  // The Claude prompt invites the model to refine it inside the page.
  const question = `What does the path from "${firstTitle}" to "${lastTitle}" reveal?`;

  const prompt = buildTrailPrompt(trail, queryRelPath, dateIso, question);

  const jobId = await startJob({
    prompt,
    projectCwd,
    projectId: project.id,
    type: "trail-query",
    title: `Trail → query: ${firstTitle} → ${lastTitle}`,
  });

  return Response.json(
    { jobId, queryRelPath, projectId: project.id },
    { status: 201 },
  );
}
