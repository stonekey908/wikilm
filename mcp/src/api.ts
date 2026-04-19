import { API_BASE_URL, WRITE_TOKEN, slugForCwd } from "./config.js";

/**
 * Thin HTTP client for the WikiLM app. All tools go through this so that
 * (a) error formatting is uniform, (b) the write-token header path is in
 * one place, and (c) `fetch`'s confusing non-throwing 4xx/5xx behavior is
 * handled once.
 */

export class WikiLMApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly url: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "WikiLMApiError";
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (WRITE_TOKEN && method !== "GET") {
    headers["X-WikiLM-Write-Token"] = WRITE_TOKEN;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "unknown network error";
    throw new WikiLMApiError(
      `Could not reach WikiLM API at ${API_BASE_URL}. Is the WikiLM app running on port 3000? (${msg})`,
      null,
      url
    );
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const errBody =
      parsed && typeof parsed === "object" && parsed !== null
        ? (parsed as { error?: string }).error
        : undefined;
    throw new WikiLMApiError(
      errBody || `WikiLM API returned ${res.status} ${res.statusText}`,
      res.status,
      url,
      parsed
    );
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
};

// ---------- Types (minimal subset of the app's shapes) ----------

export interface ProjectNode {
  id: number;
  name: string;
  slug: string;
  color: string;
  parentId: number | null;
  children: ProjectNode[];
}

export interface ProjectSummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  parentId: number | null;
  sourceCount?: number;
  pageCount?: number;
}

export interface WikiPageMeta {
  title: string;
  type: string;
  tags: string[];
  slug: string;
  filePath: string;
  updatedAt: string;
}

export interface WikiPage {
  slug: string;
  title: string;
  type: string;
  tags: string[];
  meta: Record<string, unknown>;
  body: string;
  backlinks: Array<{
    slug: string;
    title: string;
    projectId: number;
    projectSlug: string;
  }>;
}

export interface JobRow {
  id: number;
  projectId: number | null;
  type: string;
  title: string;
  status: string;
  progress: number | null;
  error: string | null;
  errorCode: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

// ---------- Project resolution ----------

function flattenTree(nodes: ProjectNode[]): ProjectNode[] {
  const out: ProjectNode[] = [];
  const walk = (ns: ProjectNode[]) => {
    for (const n of ns) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/**
 * Resolve a `project` argument (slug) + cwd into a concrete project id/slug.
 *
 * Precedence (per Q1 of the design doc):
 *   1. Explicit `arg` (interpreted as slug, exact match).
 *   2. CWD map in ~/.wikilm/project-map.json.
 *   3. Fallback: project id=1 (root).
 *
 * Throws `WikiLMApiError` if an explicit slug was passed but not found.
 */
export async function resolveProject(
  arg: string | undefined,
  cwd: string = process.cwd()
): Promise<{ id: number; slug: string; name: string }> {
  const { tree } = await api.get<{ tree: ProjectNode[] }>("/api/projects/tree");
  const all = flattenTree(tree);

  const bySlug = (slug: string) => all.find((p) => p.slug === slug);

  if (arg) {
    const hit = bySlug(arg);
    if (!hit) {
      throw new WikiLMApiError(
        `No WikiLM project found with slug "${arg}". Known slugs: ${all
          .map((p) => p.slug)
          .join(", ")}`,
        404,
        "resolveProject"
      );
    }
    return { id: hit.id, slug: hit.slug, name: hit.name };
  }

  const mapped = slugForCwd(cwd);
  if (mapped) {
    const hit = bySlug(mapped);
    if (hit) return { id: hit.id, slug: hit.slug, name: hit.name };
    console.error(
      `[wikilm-mcp] project-map.json maps ${cwd} → ${mapped}, but no such project exists. Falling back to root.`
    );
  }

  const root = all.find((p) => p.id === 1) || all[0];
  if (!root) {
    throw new WikiLMApiError(
      "No projects exist in WikiLM yet. Create one first.",
      null,
      "resolveProject"
    );
  }
  return { id: root.id, slug: root.slug, name: root.name };
}
