import { getSetting } from "@/lib/connections";

export const NOTION_TOKEN_SETTING = "notion_token"; // secret (redacted from /api/settings)
export const NOTION_PARENT_SETTING = "notion_parent_page"; // parent page id
export const NOTION_MAP_SETTING = "notion_page_map"; // JSON: { "<slug>": "<notionPageId>" }
export const NOTION_LAST_SYNC = "notion_last_sync";
export const NOTION_VERSION = "2022-06-28";

export function getNotionToken(): string | null {
  const v = getSetting(NOTION_TOKEN_SETTING)?.trim();
  return v ? v : null;
}
export function getNotionParent(): string | null {
  const v = getSetting(NOTION_PARENT_SETTING)?.trim();
  return v ? v : null;
}
export function getNotionMap(): Record<string, string> {
  try { return JSON.parse(getSetting(NOTION_MAP_SETTING) || "{}"); } catch { return {}; }
}

export function notionHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" };
}

// Split a string into Notion rich_text segments (≤2000 chars each).
function richText(content: string) {
  const out: Array<{ type: "text"; text: { content: string } }> = [];
  let s = content;
  if (!s) return out;
  while (s.length > 0) { out.push({ type: "text", text: { content: s.slice(0, 1900) } }); s = s.slice(1900); }
  return out;
}

// Minimal but faithful Markdown → Notion blocks. Handles headings, bullets,
// blockquotes, and paragraphs; wikilinks are left as literal [[text]].
export function markdownToBlocks(body: string): unknown[] {
  const blocks: unknown[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.replace(/\s+$/g, "");
    if (!line.trim()) continue;
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length; const type = `heading_${level}`;
      blocks.push({ object: "block", type, [type]: { rich_text: richText(h[2]) } });
    } else if (/^[-*]\s+/.test(line)) {
      blocks.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: richText(line.replace(/^[-*]\s+/, "")) } });
    } else if (/^>\s+/.test(line)) {
      blocks.push({ object: "block", type: "quote", quote: { rich_text: richText(line.replace(/^>\s+/, "")) } });
    } else {
      blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: richText(line) } });
    }
  }
  // Notion caps children at 100 per create call.
  return blocks.slice(0, 100);
}
