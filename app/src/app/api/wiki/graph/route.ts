import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import {
  getProject,
  listDescendants,
  wikiDir,
  type Project,
} from "@/lib/projects";
import { getAllMdFiles, parseFrontmatter } from "@/lib/wiki-utils";

/**
 * Node identity in subtree mode is project-qualified — two projects can
 * contain a page with the same slug (e.g. `index`, `queries/what-is-x`).
 * `id` is the unique graph key (`<projectId>:<slug>`); `slug` remains the
 * per-project slug used for deep-linking back into /wiki.
 */
interface GraphNode {
  id: string;
  slug: string;
  title: string;
  type: string;
  projectId: number;
  projectSlug: string;
}

interface GraphEdge {
  from: string; // node id
  to: string; // node id
  crossProject: boolean;
}

function slugFromPath(filePath: string, baseDir: string): string {
  return path.relative(baseDir, filePath).replace(/\.md$/, "").replace(/\\/g, "/");
}

function titleFromMeta(meta: Record<string, unknown>, body: string, slug: string): string {
  if (meta.title && typeof meta.title === "string") return meta.title;
  const m = body.match(/^#\s+(.+)$/m);
  if (m) return m[1];
  const parts = slug.split("/");
  return parts[parts.length - 1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function nodeId(projectId: number, slug: string): string {
  return `${projectId}:${slug}`;
}

/**
 * Collect nodes + bodies for a single project. `bodies` is keyed by node id
 * so we can walk them in the edge-resolution pass.
 */
function collectFromProject(project: Project): {
  nodes: GraphNode[];
  bodies: Map<string, string>;
} {
  const wikiPath = wikiDir(project);
  const files = getAllMdFiles(wikiPath);
  const nodes: GraphNode[] = [];
  const bodies = new Map<string, string>();

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    const { meta, body } = parseFrontmatter(content);
    const slug = slugFromPath(filePath, wikiPath);
    const pageType = (meta.type as string) || "unknown";
    const title = titleFromMeta(meta, body, slug);
    const id = nodeId(project.id, slug);
    nodes.push({
      id,
      slug,
      title,
      type: pageType,
      projectId: project.id,
      projectSlug: project.slug,
    });
    bodies.set(id, body);
  }

  return { nodes, bodies };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectIdParam = searchParams.get("projectId");
  const scope = searchParams.get("scope") === "subtree" ? "subtree" : "project";
  const projectId = projectIdParam ? Number(projectIdParam) : NaN;
  const project =
    (Number.isFinite(projectId) ? getProject(projectId) : null) ?? getProject(1);
  if (!project) {
    return Response.json({ nodes: [], edges: [], scope });
  }

  // Build the list of projects to include. `scope=project` is the single
  // active project; `scope=subtree` is the project plus every descendant.
  const allProjects: Project[] =
    scope === "subtree"
      ? [project, ...listDescendants(project)]
      : [project];

  // First pass: collect nodes + bodies across all projects in scope.
  const allNodes: GraphNode[] = [];
  const allBodies = new Map<string, string>();
  for (const p of allProjects) {
    const { nodes, bodies } = collectFromProject(p);
    allNodes.push(...nodes);
    for (const [k, v] of bodies) allBodies.set(k, v);
  }

  // Build two indexes for wikilink resolution:
  //   1. local slug-end (lowercased last segment) -> Array<node>. Multiple
  //      projects can share the same last segment; local resolution within
  //      a project prefers same-project matches.
  //   2. absolute (projectSlug/targetSlug or projectSlug/targetName) -> node.
  const localIndex = new Map<string, GraphNode[]>();
  const absoluteIndex = new Map<string, GraphNode>();

  for (const n of allNodes) {
    const end = n.slug.split("/").pop()?.toLowerCase();
    if (end) {
      const bucket = localIndex.get(end) ?? [];
      bucket.push(n);
      localIndex.set(end, bucket);
    }

    // Absolute full-slug form: [[<projectSlug>/<fullPageSlug>]]
    absoluteIndex.set(`${n.projectSlug}/${n.slug}`.toLowerCase(), n);
    // Absolute name-only form: [[<projectSlug>/<lastSegment>]].
    const lastSeg = n.slug.split("/").pop() ?? n.slug;
    absoluteIndex.set(`${n.projectSlug}/${lastSeg}`.toLowerCase(), n);
  }

  // Second pass: extract [[wikilinks]] from each body to build edges.
  // Absolute form (contains a `/`) takes precedence; we fall back to local
  // name resolution otherwise. Same-project matches are preferred for local
  // form so existing single-project behavior stays identical.
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const [fromId, body] of allBodies) {
    const fromNode = allNodes.find((n) => n.id === fromId);
    if (!fromNode) continue;

    for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const raw = m[1].trim();
      const normalizedAbsolute = raw.toLowerCase();
      const normalizedLocal = raw.toLowerCase().replace(/\s+/g, "-");

      let target: GraphNode | undefined;

      if (raw.includes("/")) {
        target = absoluteIndex.get(normalizedAbsolute);
      }

      if (!target) {
        const candidates = localIndex.get(normalizedLocal) ?? [];
        target =
          candidates.find((c) => c.projectId === fromNode.projectId) ??
          candidates[0];
      }

      if (!target) continue;
      if (target.id === fromNode.id) continue;

      const key = `${fromNode.id}->${target.id}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({
        from: fromNode.id,
        to: target.id,
        crossProject: target.projectId !== fromNode.projectId,
      });
    }
  }

  return Response.json({ nodes: allNodes, edges, scope });
}
