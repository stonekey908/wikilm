import fs from "fs";
import path from "path";

/**
 * Recursively list all `.md` file paths under `dir`.
 *
 * Returns `[]` if `dir` doesn't exist — callers don't need to pre-check
 * existence. Follows only plain entries: directories are descended into,
 * files ending in `.md` are collected, everything else is skipped.
 *
 * This is the canonical wiki walker — previously duplicated in
 * `/api/wiki`, `/api/wiki/[slug]`, `/api/wiki/graph`, `/api/dashboard`
 * (as `countMarkdownFiles`), `/api/projects/[id]/promote-page`
 * (as `listMarkdownFiles`), and `lib/projects.ts` (also `listMarkdownFiles`).
 * The `listMarkdownFiles` variants had an extra `entry.isFile()` guard which
 * is redundant given the `isDirectory()` branch above it — behavior matches.
 */
export function getAllMdFiles(dir: string): string[] {
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

/**
 * Parse the YAML-ish frontmatter block at the top of a markdown document.
 *
 * Frontmatter starts with `---` on line 1 and ends with `---` on a later
 * line; everything between is a key/value block. If no frontmatter is
 * present, returns `{ meta: {}, body: content }` untouched.
 *
 * This is NOT a full YAML parser — it only handles the shapes WikiLM
 * actually uses:
 *   - `key: value` — scalar
 *   - `key: "quoted value"` — quotes stripped
 *   - `key: [a, b, "c"]` — comma-split into string[]; surrounding quotes on
 *     each element are stripped
 *
 * Use the canonical implementation here so every reader sees the same
 * `meta.tags` shape (array, not string). The graph route previously had a
 * drifted copy that dropped the array branch, which silently turned
 * `tags: [foo, bar]` into the literal string `"[foo, bar]"` — fixed by
 * hoisting into this module.
 */
export function parseFrontmatter(content: string): {
  meta: Record<string, unknown>;
  body: string;
} {
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
