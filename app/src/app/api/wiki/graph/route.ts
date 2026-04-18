import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getProject, wikiDir } from "@/lib/projects";

interface GraphNode {
  slug: string;
  title: string;
  type: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const yamlBlock = match[1];
  const body = match[2];
  const meta: Record<string, unknown> = {};

  for (const line of yamlBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();
    if (typeof value === "string" && /^".*"$/.test(value)) value = value.slice(1, -1);
    meta[key] = value;
  }
  return { meta, body };
}

function getAllMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllMdFiles(fullPath));
    else if (entry.name.endsWith(".md")) results.push(fullPath);
  }
  return results;
}

function slugFromPath(filePath: string, wikiDir: string): string {
  return path.relative(wikiDir, filePath).replace(/\.md$/, "").replace(/\\/g, "/");
}

function titleFromMeta(meta: Record<string, unknown>, body: string, slug: string): string {
  if (meta.title && typeof meta.title === "string") return meta.title;
  const m = body.match(/^#\s+(.+)$/m);
  if (m) return m[1];
  const parts = slug.split("/");
  return parts[parts.length - 1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectIdParam = searchParams.get("projectId");
  const projectId = projectIdParam ? Number(projectIdParam) : NaN;
  const project =
    (Number.isFinite(projectId) ? getProject(projectId) : null) ?? getProject(1);
  if (!project) {
    return Response.json({ nodes: [], edges: [] });
  }
  const wikiPath = wikiDir(project);
  const files = getAllMdFiles(wikiPath);

  // First pass: collect all nodes with their slug-end for link resolution
  const nodes: GraphNode[] = [];
  const bodies = new Map<string, string>(); // slug -> body

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    const { meta, body } = parseFrontmatter(content);
    const slug = slugFromPath(filePath, wikiPath);
    const pageType = (meta.type as string) || "unknown";
    const title = titleFromMeta(meta, body, slug);
    nodes.push({ slug, title, type: pageType });
    bodies.set(slug, body);
  }

  // Build an index from "slug-end" (last segment, lowercased) to full slug so
  // we can resolve [[wikilink]] targets consistently with the wiki browser.
  const slugEndIndex = new Map<string, string>();
  for (const n of nodes) {
    const end = n.slug.split("/").pop()?.toLowerCase();
    if (end) slugEndIndex.set(end, n.slug);
  }

  // Second pass: extract [[wikilinks]] from each body to build edges
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const [fromSlug, body] of bodies) {
    for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const target = m[1].toLowerCase().replace(/\s+/g, "-");
      const resolved = slugEndIndex.get(target);
      if (!resolved || resolved === fromSlug) continue;
      const key = `${fromSlug}->${resolved}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ from: fromSlug, to: resolved });
    }
  }

  return Response.json({ nodes, edges });
}
