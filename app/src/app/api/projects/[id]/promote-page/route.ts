import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { lintFindings, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getProject,
  getProjectBySlug,
  listDescendants,
  rewriteWikilinks,
  wikiDir,
} from "@/lib/projects";

/**
 * POST /api/projects/:parentId/promote-page
 * Body: { findingId, childSlug, pageSlug }
 *
 * Moves a wiki page from a child project up to its parent, then rewrites
 * any `[[childSlug/pageSlug]]` references across every project to point at
 * the new location. On success, marks the finding as resolved.
 *
 * pageSlug may include a subdir — e.g. "concepts/debugging-heuristic" — and
 * we preserve that subpath when writing into the parent's wiki.
 *
 * Guardrails:
 * - Parent must exist.
 * - Child must be a descendant (direct or indirect) of the parent.
 * - Source file must exist.
 * - Destination must not already exist (refuse to clobber).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parentId = parseInt(id, 10);
  if (isNaN(parentId)) {
    return Response.json({ error: "Invalid parent ID" }, { status: 400 });
  }

  let body: { findingId?: number; childSlug?: string; pageSlug?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { findingId, childSlug, pageSlug } = body;

  if (
    typeof findingId !== "number" ||
    typeof childSlug !== "string" ||
    !childSlug ||
    typeof pageSlug !== "string" ||
    !pageSlug
  ) {
    return Response.json(
      { error: "findingId (number), childSlug (string), pageSlug (string) are required" },
      { status: 400 }
    );
  }

  // Reject path traversal on both slugs — both flow into filesystem paths.
  if (
    pageSlug.includes("..") ||
    pageSlug.startsWith("/") ||
    childSlug.includes("..") ||
    childSlug.startsWith("/")
  ) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const parent = getProject(parentId);
  if (!parent) {
    return Response.json({ error: "Parent project not found" }, { status: 404 });
  }

  const child = getProjectBySlug(childSlug);
  if (!child) {
    return Response.json({ error: "Child project not found" }, { status: 404 });
  }

  // Check child is a descendant of the parent (not self, not sibling).
  const descendants = listDescendants(parent);
  const isDescendant = descendants.some((d) => d.id === child.id);
  if (!isDescendant) {
    return Response.json(
      { error: `Project ${childSlug} is not a descendant of ${parent.slug}` },
      { status: 400 }
    );
  }

  const childWiki = wikiDir(child);
  const parentWiki = wikiDir(parent);

  // Resolve the source file — strip trailing .md if present, then append it.
  const cleanPageSlug = pageSlug.endsWith(".md")
    ? pageSlug.slice(0, -3)
    : pageSlug;
  const srcFile = path.join(childWiki, `${cleanPageSlug}.md`);
  const dstFile = path.join(parentWiki, `${cleanPageSlug}.md`);

  if (!fs.existsSync(srcFile)) {
    return Response.json(
      { error: `Source page not found: ${srcFile}` },
      { status: 404 }
    );
  }
  if (fs.existsSync(dstFile)) {
    return Response.json(
      {
        error: `Destination page already exists at ${parent.slug}/${cleanPageSlug}.md — remove or rename it first`,
      },
      { status: 409 }
    );
  }

  // Ensure destination directory exists.
  fs.mkdirSync(path.dirname(dstFile), { recursive: true });

  // Move the file — rename is atomic on the same filesystem.
  try {
    fs.renameSync(srcFile, dstFile);
  } catch (e) {
    return Response.json(
      { error: `Failed to move page: ${(e as Error).message}` },
      { status: 500 }
    );
  }

  // Rewrite wikilinks across every project's wiki/.
  const oldLinkSlug = `${child.slug}/${cleanPageSlug}`;
  const newLinkSlug = `${parent.slug}/${cleanPageSlug}`;
  rewriteWikilinksInAllProjects(oldLinkSlug, newLinkSlug);

  // Mark the finding resolved (best-effort — if it's already been dismissed
  // or resolved we don't care, the move already happened).
  db.update(lintFindings)
    .set({ status: "resolved", updatedAt: new Date().toISOString() })
    .where(eq(lintFindings.id, findingId))
    .run();

  return Response.json({
    success: true,
    childSlug: child.slug,
    parentSlug: parent.slug,
    pageSlug: cleanPageSlug,
    newSlug: newLinkSlug,
  });
}

/** Walk every project's wiki/ and rewrite `[[oldSlug]]` → `[[newSlug]]`. */
function rewriteWikilinksInAllProjects(oldSlug: string, newSlug: string): void {
  const allProjects = db.select().from(projects).all();
  for (const p of allProjects) {
    const dir = wikiDir(p);
    for (const file of listMarkdownFiles(dir)) {
      let content: string;
      try {
        content = fs.readFileSync(file, "utf-8");
      } catch {
        continue;
      }
      const { body, changed } = rewriteWikilinks(content, oldSlug, newSlug);
      if (changed) fs.writeFileSync(file, body);
    }
  }
}

/** Recursively list .md files under dir. */
function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

