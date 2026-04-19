import { db, sqliteDb } from "@/db";
import { projects } from "@/db/schema";
import { eq, like, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

export type Project = typeof projects.$inferSelect;

const ROOT = path.join(process.cwd(), "..");

/** Absolute path to a project's wiki directory. Handles the legacy id=1 case. */
export function wikiDir(project: Pick<Project, "id" | "slug">): string {
  if (project.id === 1) return path.join(ROOT, "wiki");
  return path.join(ROOT, "projects", project.slug, "wiki");
}

/** Absolute path to a project's root directory (contains wiki/ and raw/). */
export function projectRoot(project: Pick<Project, "id" | "slug">): string {
  if (project.id === 1) return ROOT;
  return path.join(ROOT, "projects", project.slug);
}

/** Normalize a raw name into a slug segment. Does NOT include parent prefix. */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Compose a full slug from a parent (null for root) and a name. */
export function composeSlug(parentSlug: string | null, name: string): string {
  const seg = slugifyName(name);
  return parentSlug ? `${parentSlug}/${seg}` : seg;
}

/** Get a project by id or return null. */
export function getProject(id: number): Project | null {
  return db.select().from(projects).where(eq(projects.id, id)).get() ?? null;
}

/** Get a project by slug or return null. */
export function getProjectBySlug(slug: string): Project | null {
  return db.select().from(projects).where(eq(projects.slug, slug)).get() ?? null;
}

/** List direct children of a project (one level only). */
export function listChildren(parentId: number): Project[] {
  return db.select().from(projects).where(eq(projects.parentId, parentId)).all();
}

/** True if the project has at least one child. */
export function hasChildren(id: number): boolean {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.parentId, id))
    .get();
  return (row?.n ?? 0) > 0;
}

export interface ProjectNode {
  id: number;
  name: string;
  slug: string;
  color: string;
  parentId: number | null;
  children: ProjectNode[];
}

/**
 * Build a fully-rooted tree of every project in the database. Children are
 * sorted alphabetically within each level. Orphans (rows whose parent_id
 * points at a missing row) are promoted to root so they stay reachable.
 */
export function buildTree(): ProjectNode[] {
  const all = db.select().from(projects).all();
  const byId = new Map<number, ProjectNode>();
  all.forEach((p) => {
    byId.set(p.id, {
      id: p.id,
      name: p.name,
      slug: p.slug,
      color: p.color,
      parentId: p.parentId,
      children: [],
    });
  });
  const roots: ProjectNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId == null) {
      roots.push(node);
    } else {
      const parent = byId.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node); // orphan — promote to root
    }
  }
  const sortRec = (nodes: ProjectNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** List all descendants (prefix match on slug). Includes nested children. */
export function listDescendants(project: Pick<Project, "slug">): Project[] {
  return db
    .select()
    .from(projects)
    .where(like(projects.slug, `${project.slug}/%`))
    .all();
}

/**
 * Create the on-disk directory structure for a new project.
 * Mirrors the structure POST /api/projects already creates.
 */
export function createProjectDirectories(slug: string): void {
  const root = path.join(ROOT, "projects", slug);
  const raw = path.join(root, "raw");
  const wiki = path.join(root, "wiki");
  const claudeDir = path.join(root, ".claude");

  fs.mkdirSync(raw, { recursive: true });
  fs.mkdirSync(claudeDir, { recursive: true });
  for (const sub of [
    "sources",
    "entities",
    "concepts",
    "comparisons",
    "synthesis",
    "queries",
  ]) {
    fs.mkdirSync(path.join(wiki, sub), { recursive: true });
  }

  fs.writeFileSync(
    path.join(wiki, "index.md"),
    `# Wiki Index\n\n> Tip: to link across projects, use \`[[project-slug/page-name]]\`.\n\n## Sources\n\n## Entities\n\n## Concepts\n\n## Comparisons\n\n## Synthesis\n\n## Queries\n`
  );
  fs.writeFileSync(path.join(wiki, "log.md"), `# Wiki Log\n`);
  fs.writeFileSync(path.join(claudeDir, "CLAUDE.md"), projectClaudeMd(slug));
}

/**
 * The CLAUDE.md we scaffold inside each project's own directory. It overrides
 * the repo-level WikiLM CLAUDE.md so Claude subprocesses spawned inside a
 * project don't walk up and treat the root `wiki/` as the target. Keep this
 * small — Claude will load both this one and any ancestors; the project one
 * just needs to pin the correct local paths.
 */
function projectClaudeMd(slug: string): string {
  return `# Project: ${slug}

You are maintaining the \`${slug}\` WikiLM project. Its scope is this directory only.

## Paths

All wiki paths you use must be **relative to this directory**, not the repo root:

- \`wiki/sources/<slug>.md\` — source summaries
- \`wiki/entities/<slug>.md\` — entity pages
- \`wiki/concepts/<slug>.md\` — concept pages
- \`wiki/comparisons/<slug>.md\` — comparison pages
- \`wiki/synthesis/project-overview.md\` — project synthesis
- \`wiki/queries/<slug>.md\` — preserved question answers
- \`wiki/index.md\` — this project's catalog
- \`wiki/log.md\` — this project's operation log

## Rules

1. **Never write outside \`./wiki/\`** in this project. Writes to any path outside this directory (e.g. \`../\`, \`../../wiki/\`, absolute repo-root paths) are forbidden.
2. **Cross-project wikilinks** use the absolute-slug form: \`[[other-project/page-name]]\`. Within this project, bare \`[[page-name]]\` resolves locally.
3. Apply every other rule from the repo-level WikiLM CLAUDE.md (page types, frontmatter, links) — but scoped to this project's wiki/.
`;
}

/**
 * Backfill per-project .claude/CLAUDE.md for every existing project directory.
 * Idempotent — skips projects that already have one. Run on server startup
 * (or when a nesting migration lands) to cure the pre-STO-1763 population.
 */
export function backfillProjectClaudeMd(): { created: number; skipped: number } {
  let created = 0;
  let skipped = 0;
  const all = db.select().from(projects).all();
  for (const p of all) {
    if (p.id === 1) {
      // id=1 uses the repo-root CLAUDE.md by design — don't backfill.
      skipped++;
      continue;
    }
    const claudeDir = path.join(ROOT, "projects", p.slug, ".claude");
    const claudeFile = path.join(claudeDir, "CLAUDE.md");
    if (fs.existsSync(claudeFile)) {
      skipped++;
      continue;
    }
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(claudeFile, projectClaudeMd(p.slug));
    created++;
  }
  return { created, skipped };
}

/** Escape a string for use as a literal in a RegExp. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Last segment of a slug (the part after the final "/"). */
function lastSegment(slug: string): string {
  const i = slug.lastIndexOf("/");
  return i === -1 ? slug : slug.slice(i + 1);
}

/**
 * Rewrite every `[[oldSlug]]` or `[[oldSlug/...]]` occurrence in a markdown
 * body to its newSlug equivalent. Returns { body, changed }.
 *
 * The pattern anchors on `]]` and matches the full slug (word-boundary by
 * virtue of `[[` / `]]`), so `[[foo-bar]]` won't accidentally match when the
 * renamed slug is `foo`.
 */
export function rewriteWikilinks(
  body: string,
  oldSlug: string,
  newSlug: string
): { body: string; changed: boolean } {
  const pattern = new RegExp(
    `\\[\\[${escapeRegex(oldSlug)}(\\/[^\\]]*)?\\]\\]`,
    "g"
  );
  let changed = false;
  const next = body.replace(pattern, (_, tail: string | undefined) => {
    changed = true;
    return `[[${newSlug}${tail ?? ""}]]`;
  });
  return { body: next, changed };
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

export class MoveProjectError extends Error {
  constructor(
    public code: "not_found" | "invalid" | "cycle" | "collision",
    message: string
  ) {
    super(message);
    this.name = "MoveProjectError";
  }
}

/**
 * Move a project to a new parent (or detach to root).
 *
 * - Renames the filesystem directory (one OS rename).
 * - Updates slug for the project + every descendant in a single DB
 *   transaction.
 * - Rewrites `[[oldSlug(/...)?]]` wikilinks across every project's wiki to
 *   point at the new slug.
 *
 * Rejects cycles, collisions, and attempts to move id=1 (whose wikiDir is
 * the top-level wiki/, not a projects/<slug>/ directory).
 */
export function moveProject(
  projectId: number,
  newParentId: number | null
): Project {
  const project = getProject(projectId);
  if (!project) {
    throw new MoveProjectError("not_found", "Project not found");
  }
  if (project.id === 1) {
    throw new MoveProjectError(
      "invalid",
      "Cannot move the root (id=1) project — its wiki lives at the repo root."
    );
  }

  let newParent: Project | null = null;
  if (newParentId != null) {
    newParent = getProject(newParentId);
    if (!newParent) {
      throw new MoveProjectError("not_found", "New parent not found");
    }
    if (newParent.id === project.id) {
      throw new MoveProjectError(
        "cycle",
        "Cannot move a project under itself."
      );
    }
  }

  const oldSlug = project.slug;
  const segment = lastSegment(oldSlug);
  const newSlug = newParent ? `${newParent.slug}/${segment}` : segment;

  // Noop — already in place.
  if (newSlug === oldSlug) {
    return project;
  }

  const descendants = listDescendants(project);

  // Cycle: new parent can't be the project itself or any of its descendants.
  if (newParent && descendants.some((d) => d.id === newParent!.id)) {
    throw new MoveProjectError(
      "cycle",
      "Cannot move a project under one of its descendants."
    );
  }

  // Compute the new slug for each descendant (replace old prefix).
  const renames: { id: number; oldSlug: string; newSlug: string }[] = [
    { id: project.id, oldSlug, newSlug },
  ];
  for (const d of descendants) {
    const rel = d.slug.slice(oldSlug.length); // begins with "/"
    renames.push({ id: d.id, oldSlug: d.slug, newSlug: `${newSlug}${rel}` });
  }

  // Collision check — none of the *new* slugs may already belong to a row
  // outside our rename set.
  const ownIds = new Set(renames.map((r) => r.id));
  for (const r of renames) {
    const existing = getProjectBySlug(r.newSlug);
    if (existing && !ownIds.has(existing.id)) {
      throw new MoveProjectError(
        "collision",
        `A project with slug "${r.newSlug}" already exists.`
      );
    }
  }

  // Filesystem rename — do this BEFORE touching the DB so a permission error
  // doesn't leave slugs pointing at a missing directory.
  const oldDir = path.join(ROOT, "projects", oldSlug);
  const newDir = path.join(ROOT, "projects", newSlug);
  if (fs.existsSync(oldDir)) {
    const newParentDir = path.dirname(newDir);
    fs.mkdirSync(newParentDir, { recursive: true });
    if (fs.existsSync(newDir)) {
      throw new MoveProjectError(
        "collision",
        `Destination directory already exists: ${newDir}`
      );
    }
    try {
      fs.renameSync(oldDir, newDir);
    } catch (e) {
      throw new MoveProjectError(
        "invalid",
        `Failed to rename project directory: ${(e as Error).message}`
      );
    }
  }

  // DB: update slug + parentId for project; slug for every descendant.
  // Wrapped in a better-sqlite3 transaction for atomicity.
  const tx = sqliteDb.transaction(() => {
    // parent change on the moved project itself
    db.update(projects)
      .set({ slug: newSlug, parentId: newParent?.id ?? null })
      .where(eq(projects.id, project.id))
      .run();
    // descendants — slug only (parentId relationships stay)
    for (const d of descendants) {
      const rel = d.slug.slice(oldSlug.length);
      db.update(projects)
        .set({ slug: `${newSlug}${rel}` })
        .where(eq(projects.id, d.id))
        .run();
    }
  });

  try {
    tx();
  } catch (e) {
    // DB update failed — try to undo the filesystem rename so slugs and
    // directories stay consistent.
    try {
      if (fs.existsSync(newDir) && !fs.existsSync(oldDir)) {
        fs.renameSync(newDir, oldDir);
      }
    } catch {
      // best-effort rollback; the original error is what matters.
    }
    throw new MoveProjectError(
      "invalid",
      `DB update failed: ${(e as Error).message}`
    );
  }

  // Wikilink rewrite — walk every project's wiki/ and patch .md files that
  // reference any of the renamed slugs. Do the longest old-slugs first so
  // `[[foo/bar]]` gets rewritten before the shorter `[[foo]]` prefix run.
  const sortedRenames = [...renames].sort(
    (a, b) => b.oldSlug.length - a.oldSlug.length
  );
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
      let next = content;
      let changedAny = false;
      for (const r of sortedRenames) {
        const { body, changed } = rewriteWikilinks(next, r.oldSlug, r.newSlug);
        if (changed) {
          next = body;
          changedAny = true;
        }
      }
      if (changedAny) {
        fs.writeFileSync(file, next);
      }
    }
  }

  return getProject(project.id)!;
}
