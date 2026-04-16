import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

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

    if (typeof value === "string" && /^".*"$/.test(value)) {
      value = value.slice(1, -1);
    }

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

function findBacklinks(wikiDir: string, targetSlug: string): { slug: string; title: string }[] {
  const files = getAllMdFiles(wikiDir);
  const backlinks: { slug: string; title: string }[] = [];
  // Match [[slug]] or [[filename]] patterns — check the last segment of the slug
  const targetName = targetSlug.split("/").pop() || targetSlug;

  for (const filePath of files) {
    const relative = path.relative(wikiDir, filePath).replace(/\.md$/, "").replace(/\\/g, "/");
    if (relative === targetSlug) continue;

    const content = fs.readFileSync(filePath, "utf-8");
    // Check for [[target-name]] reference (case-insensitive)
    const wikilinkPattern = new RegExp(`\\[\\[${escapeRegex(targetName)}\\]\\]`, "i");
    if (wikilinkPattern.test(content)) {
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
      backlinks.push({ slug: relative, title });
    }
  }

  return backlinks;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const wikiDir = path.join(process.cwd(), "..", "wiki");

  // The slug could be a nested path like "sources/some-page"
  // Try the slug directly, then try with subdirectories
  let filePath = path.join(wikiDir, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    // Try to find it by searching all files
    const files = getAllMdFiles(wikiDir);
    const match = files.find((f) => {
      const relative = path.relative(wikiDir, f).replace(/\.md$/, "").replace(/\\/g, "/");
      return relative === slug;
    });
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

  const backlinks = findBacklinks(wikiDir, slug);

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
