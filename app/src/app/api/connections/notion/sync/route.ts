import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getProject, wikiDir } from "@/lib/projects";
import { setSetting, getSetting } from "@/lib/connections";
import {
  getNotionToken, getNotionParent, getNotionMap, getNotionDirection, notionHeaders,
  markdownToBlocks, blocksToMarkdown, NOTION_MAP_SETTING, NOTION_LAST_SYNC,
} from "@/lib/notion";

const API = "https://api.notion.com/v1";

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
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || slug.split("/").pop()!.replace(/-/g, " ");
}
function splitFrontmatter(content: string): { fm: string; body: string } {
  const m = content.match(/^(---\n[\s\S]*?\n---\n)/);
  return m ? { fm: m[1], body: content.slice(m[1].length) } : { fm: "", body: content };
}

export async function POST(request: NextRequest) {
  let projectId = 1;
  try { projectId = ((await request.json()) as { projectId?: number })?.projectId ?? 1; } catch {}

  const token = getNotionToken();
  const parent = getNotionParent();
  if (!token) return Response.json({ error: "No Notion token configured." }, { status: 400 });
  if (!parent) return Response.json({ error: "No Notion parent page configured." }, { status: 400 });

  const project = getProject(projectId) ?? getProject(1);
  if (!project) return Response.json({ error: "No project found" }, { status: 404 });

  const direction = getNotionDirection();
  const headers = notionHeaders(token);
  const src = wikiDir(project);
  const files = listMarkdown(src).filter((f) => !["index.md", "log.md"].includes(path.basename(f)));
  const map = getNotionMap();
  const prevSyncIso = getSetting(NOTION_LAST_SYNC);
  const prevSync = prevSyncIso ? Date.parse(prevSyncIso) : 0;

  const counts = { created: 0, updated: 0, pulled: 0, skipped: 0, failed: 0 };
  const errors: string[] = [];
  const note = (e: string) => { if (errors.length < 4) errors.push(e); };

  // ── Notion API helpers ──
  const getChildren = async (pageId: string): Promise<Array<{ type: string } & Record<string, unknown>>> => {
    const r = await fetch(`${API}/blocks/${pageId}/children?page_size=100`, { headers });
    if (!r.ok) throw new Error(`children ${r.status}`);
    return ((await r.json()) as { results?: Array<{ type: string } & Record<string, unknown>> }).results ?? [];
  };
  const archiveChildren = async (pageId: string) => {
    for (const c of await getChildren(pageId)) {
      const id = (c as { id?: string }).id;
      if (id) await fetch(`${API}/blocks/${id}`, { method: "PATCH", headers, body: JSON.stringify({ archived: true }) });
    }
  };
  const lastEdited = async (pageId: string): Promise<number> => {
    const r = await fetch(`${API}/pages/${pageId}`, { headers });
    if (!r.ok) return 0;
    return Date.parse(((await r.json()) as { last_edited_time?: string }).last_edited_time ?? "") || 0;
  };

  // ── Pull: Notion → wiki (for direction pull, or two-way pages edited since last sync) ──
  if (direction === "pull" || direction === "two-way") {
    for (const [slug, pageId] of Object.entries(map)) {
      try {
        if (direction === "two-way" && (await lastEdited(pageId)) <= prevSync) continue;
        const md = blocksToMarkdown(await getChildren(pageId));
        const dest = path.join(src, `${slug}.md`);
        const prev = fs.existsSync(dest) ? fs.readFileSync(dest, "utf-8") : "";
        const { fm } = splitFrontmatter(prev);
        const next = (fm ? fm + "\n" : "") + md;
        if (next !== prev) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, next); counts.pulled++; }
      } catch (e) { counts.failed++; note(`pull ${slug}: ${(e as Error).message}`); }
    }
  }

  // ── Push: wiki → Notion (create new pages, update existing) ──
  if (direction === "push" || direction === "two-way") {
    for (const rel of files) {
      const slug = rel.replace(/\.md$/, "");
      const content = fs.readFileSync(path.join(src, rel), "utf-8");
      const { body } = splitFrontmatter(content);
      const blocks = markdownToBlocks(body);
      const title = titleOf(content, slug);
      try {
        if (map[slug]) {
          await archiveChildren(map[slug]);
          await fetch(`${API}/blocks/${map[slug]}/children`, { method: "PATCH", headers, body: JSON.stringify({ children: blocks }) });
          await fetch(`${API}/pages/${map[slug]}`, { method: "PATCH", headers, body: JSON.stringify({ properties: { title: { title: [{ text: { content: title } }] } } }) });
          counts.updated++;
        } else {
          const r = await fetch(`${API}/pages`, {
            method: "POST", headers,
            body: JSON.stringify({ parent: { page_id: parent }, properties: { title: { title: [{ text: { content: title } }] } }, children: blocks }),
          });
          if (r.ok) { const j = (await r.json()) as { id?: string }; if (j.id) map[slug] = j.id; counts.created++; }
          else { counts.failed++; note(`push ${slug}: ${r.status} ${(await r.text()).slice(0, 100)}`); }
        }
      } catch (e) { counts.failed++; note(`push ${slug}: ${(e as Error).message}`); }
    }
  }

  setSetting(NOTION_MAP_SETTING, JSON.stringify(map));
  const now = new Date().toISOString();
  setSetting(NOTION_LAST_SYNC, now);
  return Response.json({ ...counts, direction, total: files.length, lastSync: now, errors });
}
