import { NextRequest } from "next/server";
import { checkWriteToken } from "@/lib/write-guard";
import { db } from "@/db";
import { projects, sources } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import {
  wikiDir,
  composeSlug,
  getProject,
  getProjectBySlug,
  createProjectDirectories,
} from "@/lib/projects";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS() {
  return corsPreflight();
}

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
      pageCount: countMarkdownFiles(wikiDir(p)),
    };
  });

  return withCors(Response.json({ projects: enriched }));
}

export async function POST(request: NextRequest) {
  const denied = checkWriteToken(request);
  if (denied) return denied;
  const body = await request.json();
  const { name, description, color, parentId } = body as {
    name?: string;
    description?: string;
    color?: string;
    parentId?: number | null;
  };

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  let parent: { id: number; slug: string } | null = null;
  if (parentId != null) {
    const p = getProject(parentId);
    if (!p) {
      return Response.json({ error: "Parent not found" }, { status: 404 });
    }
    parent = { id: p.id, slug: p.slug };
  }

  const slug = composeSlug(parent?.slug ?? null, name);

  if (!slug) {
    return Response.json({ error: "Invalid name" }, { status: 400 });
  }

  if (getProjectBySlug(slug)) {
    return Response.json(
      { error: "Project with this slug already exists" },
      { status: 409 }
    );
  }

  createProjectDirectories(slug);

  const result = db
    .insert(projects)
    .values({
      name,
      slug,
      description: description || null,
      color: color || "#0d9488",
      parentId: parent?.id ?? null,
    })
    .returning()
    .all();

  return Response.json(result[0], { status: 201 });
}
