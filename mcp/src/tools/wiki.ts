import { z } from "zod";
import {
  api,
  resolveProject,
  streamResearch,
  type WikiPage,
  type WikiPageMeta,
  type JobRow,
} from "../api.js";

/**
 * search_wiki — GET /api/wiki?projectId=<id>&search=<q>&type=<t>
 * Returns matching page metadata (no bodies). The underlying endpoint
 * does a server-side full-text filter over title + tags + body.
 */
export const searchWikiSchema = z
  .object({
    query: z.string().min(1, "query is required"),
    type: z
      .string()
      .optional()
      .describe(
        "Optional page type filter: source | entity | concept | comparison | synthesis | query"
      ),
    project: z
      .string()
      .optional()
      .describe(
        "Project slug. If omitted, resolved from CWD map or falls back to root."
      ),
  })
  .strict();

export async function searchWiki(input: z.infer<typeof searchWikiSchema>) {
  const project = await resolveProject(input.project);
  const params = new URLSearchParams({
    projectId: String(project.id),
    search: input.query,
  });
  if (input.type) params.set("type", input.type);
  const { pages } = await api.get<{ pages: WikiPageMeta[] }>(
    `/api/wiki?${params.toString()}`
  );
  return {
    project: { id: project.id, slug: project.slug, name: project.name },
    count: pages.length,
    pages,
  };
}

/**
 * read_wiki_page — GET /api/wiki/<slug>?projectId=<id>
 * Returns the full markdown body, frontmatter meta, and backlinks.
 */
export const readWikiPageSchema = z
  .object({
    slug: z
      .string()
      .min(1, "slug is required")
      .describe(
        "Page slug relative to the project wiki root, e.g. 'concepts/vertical-slices' or 'sources/my-article'."
      ),
    project: z.string().optional(),
  })
  .strict();

export async function readWikiPage(input: z.infer<typeof readWikiPageSchema>) {
  const project = await resolveProject(input.project);
  const encoded = encodeURIComponent(input.slug);
  const page = await api.get<WikiPage>(
    `/api/wiki/${encoded}?projectId=${project.id}`
  );
  return {
    project: { id: project.id, slug: project.slug, name: project.name },
    page,
  };
}

/**
 * list_wiki_pages — GET /api/wiki?projectId=<id>
 * Metadata-only browsing. `type` is passed through to the server; `tag` is
 * filtered client-side because the endpoint doesn't support tag filters.
 */
export const listWikiPagesSchema = z
  .object({
    type: z.string().optional(),
    tag: z.string().optional(),
    project: z.string().optional(),
  })
  .strict();

export async function listWikiPages(
  input: z.infer<typeof listWikiPagesSchema>
) {
  const project = await resolveProject(input.project);
  const params = new URLSearchParams({ projectId: String(project.id) });
  if (input.type) params.set("type", input.type);
  const { pages } = await api.get<{ pages: WikiPageMeta[] }>(
    `/api/wiki?${params.toString()}`
  );
  const filtered = input.tag
    ? pages.filter((p) => p.tags.includes(input.tag!))
    : pages;
  return {
    project: { id: project.id, slug: project.slug, name: project.name },
    count: filtered.length,
    pages: filtered,
  };
}

/**
 * save_learning — POST /api/sources/upload-md
 *
 * Writes a markdown note into raw/ and creates a source row. In the current
 * app, upload-md ALWAYS kicks off ingestion; see the mismatch note in the
 * MCP README. The `ingest` flag is forwarded in the body so that when the
 * upload-md endpoint is extended to support pending-by-default, this tool
 * doesn't need to change.
 */
export const saveLearningSchema = z
  .object({
    title: z.string().min(1, "title is required"),
    content: z.string().min(1, "content is required"),
    tags: z.array(z.string()).optional(),
    project: z.string().optional(),
    ingest: z
      .boolean()
      .optional()
      .describe(
        "If true, start ingestion immediately. If false/omitted, the note is intended to sit in Pending state. NOTE: current app always ingests; this flag is forwarded for forward-compat."
      ),
  })
  .strict();

export async function saveLearning(input: z.infer<typeof saveLearningSchema>) {
  const project = await resolveProject(input.project);
  const res = await api.post<{
    sourceId: number;
    jobId?: number;
    filePath: string;
    status?: string;
  }>("/api/sources/upload-md", {
    title: input.title,
    content: input.content,
    tags: input.tags ?? [],
    projectId: project.id,
    ingest: input.ingest ?? false,
  });
  return {
    project: { id: project.id, slug: project.slug, name: project.name },
    sourceId: res.sourceId,
    jobId: res.jobId,
    filePath: res.filePath,
    // Current app behavior: ingestion always starts.
    status: res.status ?? (res.jobId ? "ingesting" : "pending_ingestion"),
    note:
      input.ingest === false
        ? "Saved. Heads-up: the current WikiLM app auto-starts ingestion on upload-md. Until the server honors `ingest: false`, this note ingests immediately. Curate from /sources."
        : undefined,
  };
}

/**
 * generate_output — POST /api/projects/:id/outputs/generate
 *
 * Queues a Claude subprocess that writes a generated artifact (report, deck,
 * cheat sheet, summary, or infographic) to the project's wiki/outputs/.
 * Returns the jobId immediately; callers poll get_job_status until it reports
 * `completed`, then read the files by base slug (same pattern as the UI).
 *
 * For decks + infographics, a post-job hook produces derived formats (.pdf,
 * .pptx, .png) alongside the primary file. All derivations share the same
 * base slug so clients can enumerate them without a second API call.
 */
export const generateOutputSchema = z
  .object({
    type: z
      .enum(["report", "cheat", "summary", "deck", "infographic"])
      .describe(
        "Output type: report (structured md+docx), cheat (dense 1-pager md+docx), summary (500-word brief md+docx), deck (Marp slides md+pdf+pptx), infographic (single-page html+png)."
      ),
    scope: z
      .enum(["project", "subtree"])
      .default("project")
      .describe(
        "project = this project only. subtree = this project plus all descendants (parent-style synthesis)."
      ),
    nudge: z
      .string()
      .optional()
      .describe(
        'Optional focus/audience hint, e.g. "focus on commercial implications" or "audience: technical".'
      ),
    project: z
      .string()
      .optional()
      .describe(
        "Project slug. If omitted, resolved from CWD map or falls back to root."
      ),
  })
  .strict();

export async function generateOutput(
  input: z.infer<typeof generateOutputSchema>
) {
  const project = await resolveProject(input.project);
  const res = await api.post<{
    jobId: number;
    baseSlug: string;
    primaryPath: string;
    type: string;
    scope: string;
  }>(`/api/projects/${project.id}/outputs/generate`, {
    type: input.type,
    scope: input.scope ?? "project",
    nudge: input.nudge,
  });
  return {
    project: { id: project.id, slug: project.slug, name: project.name },
    jobId: res.jobId,
    baseSlug: res.baseSlug,
    primaryPath: res.primaryPath,
    type: res.type,
    scope: res.scope,
    note:
      "Job queued. Poll get_job_status(jobId) until status=completed. Files land in wiki/outputs/ under the returned baseSlug.",
  };
}

/**
 * get_job_status — GET /api/claude/job then filter to the given id.
 * The app's endpoint doesn't support a jobId filter, so we pull the
 * recent list (up to 50) and match in-process.
 */
export const getJobStatusSchema = z
  .object({
    jobId: z.number().int().positive(),
  })
  .strict();

export async function getJobStatus(input: z.infer<typeof getJobStatusSchema>) {
  const { jobs } = await api.get<{ jobs: JobRow[]; runningCount: number }>(
    "/api/claude/job"
  );
  const match = jobs.find((j) => j.id === input.jobId);
  if (!match) {
    return {
      jobId: input.jobId,
      found: false,
      note:
        "Job not found in the most recent 50 jobs. It may have aged out of the list, or the id is wrong.",
    };
  }
  return {
    jobId: match.id,
    found: true,
    type: match.type,
    title: match.title,
    status: match.status,
    progress: match.progress,
    error: match.error,
    errorCode: match.errorCode,
    createdAt: match.createdAt,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
  };
}

/**
 * list_sources — GET /api/sources?projectId=<id>
 * The library of raw materials (title, type, status, url) for a project.
 */
export const listSourcesSchema = z
  .object({ project: z.string().optional() })
  .strict();

export async function listSources(input: z.infer<typeof listSourcesSchema>) {
  const project = await resolveProject(input.project);
  const { sources } = await api.get<{ sources: unknown[] }>(
    `/api/sources?projectId=${project.id}`
  );
  return {
    project: { id: project.id, slug: project.slug, name: project.name },
    count: sources.length,
    sources,
  };
}

/**
 * export_to_obsidian — POST /api/connections/obsidian/export
 * Sync trigger: mirror the project's wiki into the configured Obsidian vault.
 * Requires a vault path configured in Connections.
 */
export const exportObsidianSchema = z
  .object({ project: z.string().optional() })
  .strict();

export async function exportObsidian(
  input: z.infer<typeof exportObsidianSchema>
) {
  const project = await resolveProject(input.project);
  return api.post<{ exported: number; written: number; vault: string }>(
    `/api/connections/obsidian/export`,
    { projectId: project.id }
  );
}

/**
 * preview_source — GET /api/sources/<id>/raw
 * Returns the stored raw content + metadata for a source (e.g. a pending
 * candidate awaiting approval).
 */
export const previewSourceSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

export async function previewSource(input: z.infer<typeof previewSourceSchema>) {
  return api.get<Record<string, unknown>>(`/api/sources/${input.id}/raw`);
}

/**
 * approve_source — POST /api/sources/<id> { action: "ingest" }
 * Approve a pending source: flips it to ingesting and kicks off ingestion.
 */
export const approveSourceSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

export async function approveSource(input: z.infer<typeof approveSourceSchema>) {
  return api.post<Record<string, unknown>>(`/api/sources/${input.id}`, { action: "ingest" });
}

/**
 * dispatch_research — POST /api/sources/research (SSE)
 * Run a web-research pass for a topic and return the collected candidates.
 */
export const dispatchResearchSchema = z
  .object({
    topic: z.string().min(1, "topic is required"),
    maxResults: z.number().int().positive().max(20).optional(),
    project: z.string().optional(),
  })
  .strict();

export async function dispatchResearch(
  input: z.infer<typeof dispatchResearchSchema>
) {
  const project = await resolveProject(input.project);
  const results = await streamResearch({
    topic: input.topic,
    projectId: project.id,
    maxResults: input.maxResults ?? 8,
  });
  return {
    project: { id: project.id, slug: project.slug, name: project.name },
    count: results.length,
    results,
  };
}
