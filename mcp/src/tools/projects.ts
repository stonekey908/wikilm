import { z } from "zod";
import {
  api,
  resolveProject,
  type ProjectNode,
  type ProjectSummary,
} from "../api.js";

/**
 * list_projects — GET /api/projects/tree
 * Returns the full rooted project tree, which clients can use to pick a
 * target slug.
 */
export const listProjectsSchema = z.object({}).strict();

export async function listProjects() {
  const { tree } = await api.get<{ tree: ProjectNode[] }>(
    "/api/projects/tree"
  );
  return { tree };
}

/**
 * create_project — POST /api/projects
 * `parent` is a slug (not an id). We resolve it to an id via
 * /api/projects/tree before calling the create endpoint.
 */
export const createProjectSchema = z
  .object({
    name: z.string().min(1, "name is required"),
    description: z.string().optional(),
    parent: z
      .string()
      .optional()
      .describe(
        "Parent project slug (e.g. 'coding'). Omit to create at root."
      ),
  })
  .strict();

export async function createProject(input: z.infer<typeof createProjectSchema>) {
  let parentId: number | null = null;
  if (input.parent) {
    const parent = await resolveProject(input.parent);
    parentId = parent.id;
  }

  const created = await api.post<ProjectSummary>("/api/projects", {
    name: input.name,
    description: input.description,
    parentId,
  });
  return { project: created };
}

/**
 * get_project_synthesis — GET /api/wiki/<slug>?projectId=<id>
 * Reads the synthesis/project-overview page, which the wiki synthesizes
 * automatically after ingests.
 */
export const getProjectSynthesisSchema = z
  .object({
    project: z.string().describe("Project slug, e.g. 'coding' or 'coding/codeview'"),
  })
  .strict();

export async function getProjectSynthesis(
  input: z.infer<typeof getProjectSynthesisSchema>
) {
  const project = await resolveProject(input.project);
  // Slug path "synthesis/project-overview" URL-encoded.
  const encoded = encodeURIComponent("synthesis/project-overview");
  try {
    const page = await api.get<{
      slug: string;
      title: string;
      body: string;
      meta: Record<string, unknown>;
    }>(`/api/wiki/${encoded}?projectId=${project.id}`);
    return {
      project: { id: project.id, slug: project.slug, name: project.name },
      title: page.title,
      body: page.body,
      meta: page.meta,
    };
  } catch (err) {
    // If the synthesis page doesn't exist yet, return a helpful structured
    // response instead of bubbling a raw 404.
    const e = err as { status?: number; message?: string };
    if (e.status === 404) {
      return {
        project: { id: project.id, slug: project.slug, name: project.name },
        title: null,
        body: null,
        note: `No synthesis/project-overview page exists for project "${project.slug}" yet. Ingest at least one source to trigger synthesis, or run it manually from /wiki.`,
      };
    }
    throw err;
  }
}
