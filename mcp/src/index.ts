#!/usr/bin/env node
/**
 * WikiLM MCP server (v1) — read + additive writes only.
 *
 * Exposes 8 tools that proxy the WikiLM app's HTTP API:
 *   list_projects, create_project, search_wiki, read_wiki_page,
 *   list_wiki_pages, get_project_synthesis, save_learning, get_job_status.
 *
 * Destructive operations (move/delete/promote) are deliberately out of scope
 * for v1 — they will land behind preview/confirm pairs in a follow-up.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  API_BASE_URL,
  PROJECT_MAP_PATH,
  WRITE_TOKEN,
  loadProjectMap,
} from "./config.js";
import { WikiLMApiError } from "./api.js";

import {
  listProjects,
  listProjectsSchema,
  createProject,
  createProjectSchema,
  getProjectSynthesis,
  getProjectSynthesisSchema,
} from "./tools/projects.js";
import {
  searchWiki,
  searchWikiSchema,
  readWikiPage,
  readWikiPageSchema,
  listWikiPages,
  listWikiPagesSchema,
  saveLearning,
  saveLearningSchema,
  getJobStatus,
  getJobStatusSchema,
} from "./tools/wiki.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

/**
 * Wrap a tool handler so that:
 *   - return values are rendered as JSON in the text content block,
 *   - the same value is also placed on `structuredContent` for clients that
 *     prefer structured results,
 *   - `WikiLMApiError` (and other errors) become `isError: true` tool results
 *     with a human-readable message, rather than protocol-level failures.
 */
function wrap<I, O extends Record<string, unknown>>(
  handler: (input: I) => Promise<O>
): (input: I) => Promise<ToolResult> {
  return async (input) => {
    try {
      const result = await handler(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (err) {
      let message: string;
      if (err instanceof WikiLMApiError) {
        message = `WikiLM API error: ${err.message}${
          err.status ? ` (status ${err.status})` : ""
        }`;
      } else if (err instanceof Error) {
        message = err.message;
      } else {
        message = String(err);
      }
      return {
        content: [{ type: "text", text: message }],
        isError: true,
      };
    }
  };
}

async function main() {
  // Surface environment to stderr on boot. Keep stdout clean for stdio transport.
  console.error(`[wikilm-mcp] starting…`);
  console.error(`[wikilm-mcp] API_BASE_URL = ${API_BASE_URL}`);
  console.error(`[wikilm-mcp] project map path = ${PROJECT_MAP_PATH}`);
  if (WRITE_TOKEN) {
    console.error(`[wikilm-mcp] WIKILM_WRITE_TOKEN set; forwarding on writes.`);
  }
  // Trigger project map load (creates sample if missing, logs warnings).
  loadProjectMap();

  const server = new McpServer(
    { name: "wikilm-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  // --- Read tools ---

  server.registerTool(
    "list_projects",
    {
      title: "List WikiLM projects",
      description:
        "Return the full rooted project tree. Use this to pick a target slug for other tools.",
      inputSchema: listProjectsSchema.shape,
    },
    wrap(async () => listProjects())
  );

  server.registerTool(
    "search_wiki",
    {
      title: "Search a WikiLM project",
      description:
        "Full-text search over title, tags, and body of wiki pages in a project. Returns page metadata + slugs; use read_wiki_page for bodies. Project defaults to the CWD-mapped project, falling back to root.",
      inputSchema: searchWikiSchema.shape,
    },
    wrap(searchWiki)
  );

  server.registerTool(
    "read_wiki_page",
    {
      title: "Read a WikiLM page",
      description:
        "Fetch a single wiki page by slug — returns frontmatter, markdown body, and backlinks from every project. Slug is relative to the project wiki root (e.g. 'concepts/foo' or 'sources/bar').",
      inputSchema: readWikiPageSchema.shape,
    },
    wrap(readWikiPage)
  );

  server.registerTool(
    "list_wiki_pages",
    {
      title: "List WikiLM pages",
      description:
        "Metadata-only listing of all pages in a project. Supports server-side type filter and client-side tag filter.",
      inputSchema: listWikiPagesSchema.shape,
    },
    wrap(listWikiPages)
  );

  server.registerTool(
    "get_project_synthesis",
    {
      title: "Read a project's synthesis overview",
      description:
        "Returns the synthesis/project-overview page for a project — the wiki's auto-generated roll-up across all sources.",
      inputSchema: getProjectSynthesisSchema.shape,
    },
    wrap(getProjectSynthesis)
  );

  // --- Additive write tools ---

  server.registerTool(
    "create_project",
    {
      title: "Create a WikiLM project",
      description:
        "Create a new wiki project. Pass `parent` (a slug) to nest underneath an existing project. Slug is auto-derived from `name`.",
      inputSchema: createProjectSchema.shape,
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    wrap(createProject)
  );

  server.registerTool(
    "save_learning",
    {
      title: "Save a note into WikiLM",
      description:
        "Capture markdown content into a project's raw/ folder. Defaults to pending (user curates in /sources). Pass `ingest: true` to kick off immediate ingestion.",
      inputSchema: saveLearningSchema.shape,
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    wrap(saveLearning)
  );

  server.registerTool(
    "get_job_status",
    {
      title: "Check a WikiLM job",
      description:
        "Look up the status + progress of a background job (e.g. an ingestion). Returns { found: false } if the job has aged out of the recent-50 list.",
      inputSchema: getJobStatusSchema.shape,
    },
    wrap(getJobStatus)
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[wikilm-mcp] ready (stdio).");
}

main().catch((err) => {
  console.error("[wikilm-mcp] fatal:", err);
  process.exit(1);
});
