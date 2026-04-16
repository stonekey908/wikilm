import { NextRequest } from "next/server";
import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  if (isNaN(sessionId)) {
    return Response.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const body = await request.json();
  const { role, content } = body;

  if (!role || !content) {
    return Response.json(
      { error: "role and content are required" },
      { status: 400 }
    );
  }

  // Insert message
  const result = db
    .insert(chatMessages)
    .values({ sessionId, role, content })
    .returning()
    .all();

  // Update session updatedAt
  db.update(chatSessions)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(chatSessions.id, sessionId))
    .run();

  return Response.json(result[0], { status: 201 });
}
