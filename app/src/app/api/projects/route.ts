import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function GET() {
  const allProjects = db.select().from(projects).all();
  return Response.json({ projects: allProjects });
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
