import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * WikiLM API base URL. Defaults to http://localhost:3000.
 * Override with WIKILM_API_URL env var.
 */
export const API_BASE_URL =
  process.env.WIKILM_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

/**
 * Optional write token (forward-compatibility — see Q2 in the design doc).
 * Unset → no header sent. Set → forwarded as `X-WikiLM-Write-Token`.
 */
export const WRITE_TOKEN = process.env.WIKILM_WRITE_TOKEN || null;

/**
 * Path to the CWD→slug project map file. Defaults to ~/.wikilm/project-map.json.
 */
export const PROJECT_MAP_PATH =
  process.env.WIKILM_PROJECT_MAP ||
  path.join(os.homedir(), ".wikilm", "project-map.json");

/**
 * Sample project map written to disk if PROJECT_MAP_PATH doesn't exist yet,
 * so the user has a discoverable starting point.
 */
const SAMPLE_MAP = {
  "//":
    "Map absolute dev-project paths to WikiLM project slugs. " +
    "Delete this comment key once you've added real entries.",
  "/Users/you/code/codeview": "coding/codeview",
};

interface ProjectMap {
  [cwd: string]: string;
}

let cachedMap: ProjectMap | null = null;

/**
 * Load the CWD→slug project map. Creates a sample file if missing.
 * Logs to stderr (stdout is reserved for MCP stdio transport).
 */
export function loadProjectMap(): ProjectMap {
  if (cachedMap) return cachedMap;

  if (!fs.existsSync(PROJECT_MAP_PATH)) {
    try {
      fs.mkdirSync(path.dirname(PROJECT_MAP_PATH), { recursive: true });
      fs.writeFileSync(
        PROJECT_MAP_PATH,
        JSON.stringify(SAMPLE_MAP, null, 2) + "\n",
        "utf-8"
      );
      console.error(
        `[wikilm-mcp] wrote sample project map to ${PROJECT_MAP_PATH}`
      );
    } catch (err) {
      console.error(
        `[wikilm-mcp] could not write sample project map to ${PROJECT_MAP_PATH}:`,
        err
      );
    }
    console.error(
      "[wikilm-mcp] no project map yet; tool calls will need explicit `project` or fall back to root."
    );
    cachedMap = {};
    return cachedMap;
  }

  try {
    const raw = fs.readFileSync(PROJECT_MAP_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("project map JSON must be an object");
    }
    // Drop comment keys (anything starting with //), keep only string values.
    const clean: ProjectMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (k.startsWith("//")) continue;
      if (typeof v === "string") clean[k] = v;
    }
    cachedMap = clean;
    return cachedMap;
  } catch (err) {
    console.error(
      `[wikilm-mcp] failed to parse project map at ${PROJECT_MAP_PATH}:`,
      err
    );
    cachedMap = {};
    return cachedMap;
  }
}

/**
 * Look up a slug for the given cwd. Longest-prefix wins so that a project at
 * /a/b/c takes precedence over a broader entry at /a/b.
 */
export function slugForCwd(cwd: string): string | null {
  const map = loadProjectMap();
  let bestKey: string | null = null;
  for (const key of Object.keys(map)) {
    if (cwd === key || cwd.startsWith(key + path.sep) || cwd.startsWith(key + "/")) {
      if (!bestKey || key.length > bestKey.length) bestKey = key;
    }
  }
  return bestKey ? map[bestKey] : null;
}
