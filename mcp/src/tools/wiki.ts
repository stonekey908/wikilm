import { z } from "zod";
import {
  api,
  resolveProject,
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
