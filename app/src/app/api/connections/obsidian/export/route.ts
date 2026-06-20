import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getProject, wikiDir } from "@/lib/projects";
import { getSetting, setSetting } from "@/lib/connections";

const PATH_KEY = "obsidian_vault_path";
const LAST_KEY = "obsidian_last_export";

function listMarkdown(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMarkdown(full, base));
    else if (entry.name.endsWith(".md")) out.push(path.relative(base, full));
  }
  return out;
}

// Export a project's wiki to an Obsidian vault. The pages are already linked
// Markdown ([[wikilinks]] + frontmatter), so this mirrors them into the vault
// preserving the folder structure; Obsidian's graph then reflects the wiki.
// Incremental + non-destructive: only writes when content differs.
export async function POST(request: NextRequest) {
  let projectId = 1;
  try { projectId = ((await request.json()) as { projectId?: number })?.projectId ?? 1; } catch {}

  const vaultPath = (getSetting(PATH_KEY) || "").trim();
  if (!vaultPath) return Response.json({ error: "No Obsidian vault path configured." }, { status: 400 });

  const project = getProject(projectId) ?? getProject(1);
  if (!project) return Response.json({ error: "No project found" }, { status: 404 });

  const src = wikiDir(project);
  const files = listMarkdown(src);
  let written = 0;
  try {
    fs.mkdirSync(vaultPath, { recursive: true });
    for (const rel of files) {
      const content = fs.readFileSync(path.join(src, rel), "utf-8");
      const dest = path.join(vaultPath, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const prev = fs.existsSync(dest) ? fs.readFileSync(dest, "utf-8") : null;
      if (prev !== content) { fs.writeFileSync(dest, content); written++; }
    }
  } catch (e) {
    return Response.json({ error: `Export failed: ${(e as Error).message}` }, { status: 500 });
  }

  const now = new Date().toISOString();
  setSetting(LAST_KEY, now);
  return Response.json({ exported: files.length, written, vault: vaultPath, lastExport: now });
}
