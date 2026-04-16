import { NextRequest } from "next/server";
import { db } from "@/db";
import { chatSessions } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const sessions = db
    .select()
    .from(chatSessions)
    .orderBy(desc(chatSessions.updatedAt))
    .all();

  return Response.json({ sessions });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, title } = body;

  if (!projectId || !title) {
    return Response.json(
      { error: "projectId and title are required" },
      { status: 400 }
    );
  }

  const result = db
    .insert(chatSessions)
    .values({ projectId, title })
    .returning()
    .all();

  return Response.json(result[0], { status: 201 });
}
