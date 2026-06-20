import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getProject, wikiDir } from "@/lib/projects";
import { setSetting, getSetting } from "@/lib/connections";
import {
  getNotionToken, getNotionParent, getNotionMap, getNotionDirection, getNotionHub,
  getNotionProjectPages, notionHeaders, markdownToBlocks, blocksToMarkdown,
  NOTION_MAP_SETTING, NOTION_LAST_SYNC, NOTION_HUB_SETTING, NOTION_PROJECT_PAGES_SETTING,
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
  const prefix = `${projectId}:`;

  const counts = { created: 0, updated: 0, deleted: 0, pulled: 0, failed: 0 };
  const errors: string[] = [];
  const note = (e: string) => { if (errors.length < 4) errors.push(e); };

  // ── Notion API helpers ──
  const createPage = async (parentId: string, title: string, children: unknown[] = []): Promise<string | null> => {
    const r = await fetch(`${API}/pages`, {
      method: "POST", headers,
      body: JSON.stringify({ parent: { page_id: parentId }, properties: { title: { title: [{ text: { content: title } }] } }, children }),
    });
    if (!r.ok) { note(`create "${title}": ${r.status} ${(await r.text()).slice(0, 100)}`); return null; }
    return ((await r.json()) as { id?: string }).id ?? null;
  };
  const getChildren = async (pageId: string): Promise<Array<{ type: string; id?: string } & Record<string, unknown>>> => {
    const r = await fetch(`${API}/blocks/${pageId}/children?page_size=100`, { headers });
    if (!r.ok) throw new Error(`children ${r.status}`);
    return ((await r.json()) as { results?: Array<{ type: string; id?: string } & Record<string, unknown>> }).results ?? [];
  };
  const archivePage = async (pageId: string) => {
    await fetch(`${API}/pages/${pageId}`, { method: "PATCH", headers, body: JSON.stringify({ archived: true }) });
  };
  const replaceChildren = async (pageId: string, blocks: unknown[]) => {
    for (const c of await getChildren(pageId)) {
      if (c.id) await fetch(`${API}/blocks/${c.id}`, { method: "PATCH", headers, body: JSON.stringify({ archived: true }) });
    }
    await fetch(`${API}/blocks/${pageId}/children`, { method: "PATCH", headers, body: JSON.stringify({ children: blocks }) });
  };
  const lastEdited = async (pageId: string): Promise<number> => {
    const r = await fetch(`${API}/pages/${pageId}`, { headers });
    if (!r.ok) return 0;
    return Date.parse(((await r.json()) as { last_edited_time?: string }).last_edited_time ?? "") || 0;
  };

  // ── Ensure a dedicated "wikiLM" hub + per-project container page ──
  let hub = getNotionHub();
  if (!hub) { hub = await createPage(parent, "wikiLM"); if (hub) setSetting(NOTION_HUB_SETTING, hub); }
  if (!hub) return Response.json({ error: "Could not create the wikiLM hub page (is the parent shared with the integration?)", errors }, { status: 502 });

  const projectPages = getNotionProjectPages();
  let container = projectPages[String(projectId)];
  if (!container) {
    const made = await createPage(hub, project.name);
    if (made) { container = made; projectPages[String(projectId)] = made; setSetting(NOTION_PROJECT_PAGES_SETTING, JSON.stringify(projectPages)); }
  }
  if (!container) return Response.json({ error: "Could not create the project page in Notion.", errors }, { status: 502 });

  // ── Pull (Notion → wiki). Wiki stays source of truth: missing/deleted Notion
  //    pages never delete wiki pages — they're just skipped. ──
  if (direction === "pull" || direction === "two-way") {
    for (const [key, pageId] of Object.entries(map)) {
      if (!key.startsWith(prefix)) continue;
      const slug = key.slice(prefix.length);
      try {
        if (direction === "two-way" && (await lastEdited(pageId)) <= prevSync) continue;
        const md = blocksToMarkdown(await getChildren(pageId));
        const dest = path.join(src, `${slug}.md`);
        const prev = fs.existsSync(dest) ? fs.readFileSync(dest, "utf-8") : "";
        const { fm } = splitFrontmatter(prev);
        const next = (fm ? fm + "\n" : "") + md;
        if (next !== prev) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, next); counts.pulled++; }
      } catch { /* page gone in Notion → skip; wiki is source of truth */ }
    }
  }

  // ── Push (wiki → Notion): create new, update existing, delete removed. ──
  if (direction === "push" || direction === "two-way") {
    const seen = new Set<string>();
    for (const rel of files) {
      const slug = rel.replace(/\.md$/, "");
      const key = prefix + slug;
      seen.add(key);
      const content = fs.readFileSync(path.join(src, rel), "utf-8");
      const { body } = splitFrontmatter(content);
      const blocks = markdownToBlocks(body);
      const title = titleOf(content, slug);
      try {
        if (map[key]) {
          await replaceChildren(map[key], blocks);
          await fetch(`${API}/pages/${map[key]}`, { method: "PATCH", headers, body: JSON.stringify({ properties: { title: { title: [{ text: { content: title } }] } } }) });
          counts.updated++;
        } else {
          const id = await createPage(container, title, blocks);
          if (id) { map[key] = id; counts.created++; } else counts.failed++;
        }
      } catch (e) { counts.failed++; note(`push ${slug}: ${(e as Error).message}`); }
    }
    // Deletions: map entries for this project whose wiki file is gone → archive.
    for (const key of Object.keys(map)) {
      if (!key.startsWith(prefix) || seen.has(key)) continue;
      try { await archivePage(map[key]); delete map[key]; counts.deleted++; }
      catch (e) { counts.failed++; note(`delete ${key}: ${(e as Error).message}`); }
    }
  }

  setSetting(NOTION_MAP_SETTING, JSON.stringify(map));
  const now = new Date().toISOString();
  setSetting(NOTION_LAST_SYNC, now);
  return Response.json({ ...counts, direction, total: files.length, lastSync: now, errors });
}
