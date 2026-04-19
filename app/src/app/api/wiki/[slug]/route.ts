import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getProject, wikiDir, type Project } from "@/lib/projects";
import { getAllMdFiles, parseFrontmatter } from "@/lib/wiki-utils";

interface Backlink {
  slug: string;
  title: string;
  projectId: number;
  projectSlug: string;
}

/**
 * Scan a single project's wiki for references to the target page. Matches
 * two forms:
 *   1. Local: `[[<targetName>]]` — last segment of the slug, resolved by
 *      the active project's pages. Preserved for backward compatibility.
 *   2. Absolute: `[[<currentProject.slug>/<targetSlug>]]` — explicit
 *      cross-project reference using the project's full slug path and the
 *      target page slug. Any `/` beyond the project slug counts.
 *
 * `currentProject` is the project the target page lives in; `scanProject`
 * is the project we're scanning files in (may be the same, may be a sibling,
 * ancestor, or descendant).
 */
function findBacklinks(
  scanProject: Project,
  targetSlug: string,
  currentProject: Project
): Backlink[] {
  const dir = wikiDir(scanProject);
  const files = getAllMdFiles(dir);
  const backlinks: Backlink[] = [];
  const targetName = targetSlug.split("/").pop() || targetSlug;

  // Local-form pattern: [[target-name]] — only valid when scanning the
  // same project as the target (otherwise a bare name is ambiguous).
  const localPattern = new RegExp(
    `\\[\\[${escapeRegex(targetName)}\\]\\]`,
    "i"
  );
  // Absolute-form pattern: [[<projectSlug>/<...>/<targetName-or-targetSlug>]]
  // Two shapes are accepted:
  //   [[<projectSlug>/<targetSlug>]]   — full page slug path (incl. subdirs)
  //   [[<projectSlug>/<targetName>]]   — last segment of the slug (common form)
  // `[^\]]+` keeps the match bounded inside the brackets so it never
  // greedily grabs past the closing `]]`.
  const absoluteFullPattern = new RegExp(
    `\\[\\[${escapeRegex(`${currentProject.slug}/${targetSlug}`)}\\]\\]`,
    "i"
  );
  const absoluteNamePattern = new RegExp(
    `\\[\\[${escapeRegex(`${currentProject.slug}/${targetName}`)}\\]\\]`,
    "i"
  );

  const isSameProject = scanProject.id === currentProject.id;

  for (const filePath of files) {
    const relative = path.relative(dir, filePath).replace(/\.md$/, "").replace(/\\/g, "/");
    // Skip the target file itself when scanning its own project.
    if (isSameProject && relative === targetSlug) continue;

    const content = fs.readFileSync(filePath, "utf-8");
    const hasLocal = isSameProject && localPattern.test(content);
    const hasAbsolute =
      absoluteFullPattern.test(content) || absoluteNamePattern.test(content);
    if (!hasLocal && !hasAbsolute) continue;

    const { meta, body } = parseFrontmatter(content);
    let title = (meta.title as string) || "";
    if (!title) {
      const headingMatch = body.match(/^#\s+(.+)$/m);
      if (headingMatch) title = headingMatch[1];
    }
    if (!title) {
      const parts = relative.split("/");
      title = parts[parts.length - 1]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    backlinks.push({
      slug: relative,
      title,
      projectId: scanProject.id,
      projectSlug: scanProject.slug,
    });
  }

  return backlinks;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const projectIdParam = searchParams.get("projectId");
  const projectId = projectIdParam ? Number(projectIdParam) : NaN;
  const project =
    (Number.isFinite(projectId) ? getProject(projectId) : null) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "Page not found" }, { status: 404 });
  }
  const wikiPath = wikiDir(project);

  // The slug could be a nested path like "sources/some-page"
  // Try the slug directly, then try with subdirectories
  let filePath = path.join(wikiPath, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    // Try to find it by searching all files. First try exact relative-path
    // match; if that fails, fall back to matching by last segment so
    // cross-project wikilinks like [[project/bare-name]] still resolve when
    // the target lives under a type subdir (entities/, concepts/, …).
    const files = getAllMdFiles(wikiPath);
    const toRelative = (f: string) =>
      path.relative(wikiPath, f).replace(/\.md$/, "").replace(/\\/g, "/");
    let match = files.find((f) => toRelative(f) === slug);
    if (!match) {
      match = files.find((f) => {
        const rel = toRelative(f);
        return rel.split("/").pop() === slug;
      });
    }
    if (match) {
      filePath = match;
    } else {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const { meta, body } = parseFrontmatter(content);

  const title = (meta.title as string) || (() => {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch) return headingMatch[1];
    const parts = slug.split("/");
    return parts[parts.length - 1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  })();

  // Scan every project's wiki for references to this page — both local
  // `[[target-name]]` (only within the owning project) and absolute
  // `[[<currentProject.slug>/<targetSlug>]]` (any project, including self
  // if someone wrote it explicitly).
  const allProjects = db.select().from(projects).all();
  const backlinks = allProjects.flatMap((p) => findBacklinks(p, slug, project));

  return Response.json({
    slug,
    title,
    type: (meta.type as string) || "unknown",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    meta,
    body,
    backlinks,
  });
}
