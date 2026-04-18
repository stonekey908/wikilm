import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getProject, wikiDir } from "@/lib/projects";

interface WikiPageMeta {
  title: string;
  type: string;
  tags: string[];
  slug: string;
  filePath: string;
  updatedAt: string;
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

    // Remove surrounding quotes
    if (typeof value === "string" && /^".*"$/.test(value)) {
      value = value.slice(1, -1);
    }

    // Parse arrays like [tag1, tag2]
    if (typeof value === "string" && /^\[.*\]$/.test(value)) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""));
    }

    meta[key] = value;
  }

  return { meta, body };
}

function getAllMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function slugFromPath(filePath: string, wikiDir: string): string {
  const relative = path.relative(wikiDir, filePath);
  return relative.replace(/\.md$/, "").replace(/\\/g, "/");
}

function titleFromMeta(meta: Record<string, unknown>, body: string, slug: string): string {
  if (meta.title && typeof meta.title === "string") return meta.title;
  // Try first heading
  const headingMatch = body.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1];
  // Fall back to slug
  const parts = slug.split("/");
  return parts[parts.length - 1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectIdParam = searchParams.get("projectId");
  const projectId = projectIdParam ? Number(projectIdParam) : NaN;
  const project =
    (Number.isFinite(projectId) ? getProject(projectId) : null) ?? getProject(1);
  if (!project) {
    return Response.json({ pages: [] });
  }
  const wikiPath = wikiDir(project);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const typeFilter = searchParams.get("type") || "";

  const files = getAllMdFiles(wikiPath);
  const pages: WikiPageMeta[] = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    const { meta, body } = parseFrontmatter(content);
    const slug = slugFromPath(filePath, wikiPath);
    const pageType = (meta.type as string) || "unknown";
    const tags = Array.isArray(meta.tags) ? (meta.tags as string[]) : [];
    const title = titleFromMeta(meta, body, slug);

    // Apply type filter
    if (typeFilter && pageType !== typeFilter) continue;

    // Apply search filter
    if (search) {
      const searchable = `${title} ${tags.join(" ")} ${body}`.toLowerCase();
      if (!searchable.includes(search)) continue;
    }

    const stat = fs.statSync(filePath);
    pages.push({
      title,
      type: pageType,
      tags,
      slug,
      filePath: path.relative(wikiPath, filePath),
      updatedAt: stat.mtime.toISOString(),
    });
  }

  // Sort: index first, then alphabetically by title
  pages.sort((a, b) => {
    if (a.slug === "index") return -1;
    if (b.slug === "index") return 1;
    return a.title.localeCompare(b.title);
  });

  return Response.json({ pages });
}
