import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { hasChildren } from "@/lib/projects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id, 10);

  if (isNaN(projectId)) {
    return Response.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  return Response.json(project);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id, 10);
  const body = await request.json();

  if (isNaN(projectId)) {
    return Response.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.color) updates.color = body.color;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  db.update(projects).set(updates).where(eq(projects.id, projectId)).run();

  const updated = db.select().from(projects).where(eq(projects.id, projectId)).get();
  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id, 10);

  if (isNaN(projectId)) {
    return Response.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (hasChildren(projectId)) {
    return Response.json(
      {
        error: "Cannot delete a project that has children. Delete or move children first.",
      },
      { status: 409 }
    );
  }

  // Delete project directory
  const projectRoot = path.join(process.cwd(), "..", "projects", project.slug);
  if (fs.existsSync(projectRoot)) {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }

  // Delete from DB
  db.delete(projects).where(eq(projects.id, projectId)).run();

  return Response.json({ success: true });
}
