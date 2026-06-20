import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getProject, wikiDir } from "@/lib/projects";
import { setSetting } from "@/lib/connections";
import {
  getNotionToken, getNotionParent, getNotionMap, notionHeaders, markdownToBlocks,
  NOTION_MAP_SETTING, NOTION_LAST_SYNC,
} from "@/lib/notion";

function listMarkdown(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listMarkdown(full, base));
    else if (e.name.endsWith(".md")) out.push(path.relative(base, full));
  }
  return out;
}

function titleOf(content: string, slug: string): string {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  const t = fm?.[1].match(/^title:\s*(.+)$/m)?.[1]?.trim();
  if (t) return t.replace(/^["']|["']$/g, "");
  const h = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h) return h;
  return slug.split("/").pop()!.replace(/-/g, " ");
}
function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

/**
 * Push (wiki → Notion). Creates a Notion child page per wiki page under the
 * configured parent, tracking a slug→pageId map so re-syncs don't duplicate.
 * Notion→wiki pull and block-level updates are the follow-up half.
 */
export async function POST(request: NextRequest) {
  let projectId = 1;
  try { projectId = ((await request.json()) as { projectId?: number })?.projectId ?? 1; } catch {}

  const token = getNotionToken();
  const parent = getNotionParent();
  if (!token) return Response.json({ error: "No Notion token configured." }, { status: 400 });
  if (!parent) return Response.json({ error: "No Notion parent page configured." }, { status: 400 });

  const project = getProject(projectId) ?? getProject(1);
  if (!project) return Response.json({ error: "No project found" }, { status: 404 });

  const src = wikiDir(project);
  const files = listMarkdown(src).filter((f) => !["index.md", "log.md"].includes(path.basename(f)));
  const map = getNotionMap();
  let created = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const rel of files) {
    const slug = rel.replace(/\.md$/, "");
    if (map[slug]) { skipped++; continue; } // already synced (update is follow-up)
    const content = fs.readFileSync(path.join(src, rel), "utf-8");
    try {
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: notionHeaders(token),
        body: JSON.stringify({
          parent: { page_id: parent },
          properties: { title: { title: [{ text: { content: titleOf(content, slug) } }] } },
          children: markdownToBlocks(stripFrontmatter(content)),
        }),
      });
      if (res.ok) { const j = (await res.json()) as { id?: string }; if (j.id) map[slug] = j.id; created++; }
      else { failed++; if (errors.length < 3) errors.push(`${slug}: ${res.status} ${(await res.text()).slice(0, 120)}`); }
    } catch (e) { failed++; if (errors.length < 3) errors.push(`${slug}: ${(e as Error).message}`); }
  }

  setSetting(NOTION_MAP_SETTING, JSON.stringify(map));
  const now = new Date().toISOString();
  setSetting(NOTION_LAST_SYNC, now);
  return Response.json({ created, skipped, failed, total: files.length, lastSync: now, errors });
}
