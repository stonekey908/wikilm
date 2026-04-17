import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects, sources } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const EXCLUDED_PAGE_FILES = new Set(["index.md", "log.md"]);

function countMarkdownFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countMarkdownFiles(path.join(dir, entry.name));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      !EXCLUDED_PAGE_FILES.has(entry.name)
    ) {
      count++;
    }
  }
  return count;
}

function wikiDirForProject(project: { id: number; slug: string }): string {
  const root = path.join(process.cwd(), "..");
  // id=1 is the default project — its wiki lives at the top-level wiki/
  // (ingest jobs always write there, see claude-runner projectCwd)
  if (project.id === 1) return path.join(root, "wiki");
  return path.join(root, "projects", project.slug, "wiki");
}

export async function GET() {
  const allProjects = db.select().from(projects).all();

  const enriched = allProjects.map((p) => {
    const sourceCountRow = db
      .select({ n: sql<number>`count(*)` })
      .from(sources)
      .where(eq(sources.projectId, p.id))
      .get();

    return {
      ...p,
      sourceCount: sourceCountRow?.n ?? 0,
      pageCount: countMarkdownFiles(wikiDirForProject(p)),
    };
  });

  return Response.json({ projects: enriched });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, color } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Check for duplicate slug
  const existing = db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .get();

  if (existing) {
    return Response.json({ error: "Project with this name already exists" }, { status: 409 });
  }

  // Create project directories
  const projectRoot = path.join(process.cwd(), "..", "projects", slug);
  const rawDir = path.join(projectRoot, "raw");
  const wikiDir = path.join(projectRoot, "wiki");

  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(path.join(wikiDir, "sources"), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, "entities"), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, "concepts"), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, "comparisons"), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, "synthesis"), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, "queries"), { recursive: true });

  // Create index.md and log.md
  fs.writeFileSync(
    path.join(wikiDir, "index.md"),
    `# Wiki Index\n\n## Sources\n\n## Entities\n\n## Concepts\n\n## Comparisons\n\n## Synthesis\n\n## Queries\n`
  );
  fs.writeFileSync(path.join(wikiDir, "log.md"), `# Wiki Log\n`);

  // Insert into DB
  const result = db
    .insert(projects)
    .values({
      name,
      slug,
      description: description || null,
      color: color || "#0d9488",
    })
    .returning()
    .all();

  return Response.json(result[0], { status: 201 });
}
