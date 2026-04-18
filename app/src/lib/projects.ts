import { db } from "@/db";
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

  fs.mkdirSync(raw, { recursive: true });
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
    `# Wiki Index\n\n## Sources\n\n## Entities\n\n## Concepts\n\n## Comparisons\n\n## Synthesis\n\n## Queries\n`
  );
  fs.writeFileSync(path.join(wiki, "log.md"), `# Wiki Log\n`);
}
