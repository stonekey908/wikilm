import { NextRequest } from "next/server";
import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  if (isNaN(sessionId)) {
    return Response.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const session = db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .get();

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const messages = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .all();

  return Response.json({ session, messages });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  if (isNaN(sessionId)) {
    return Response.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const session = db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .get();

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Delete messages first, then session
  db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId)).run();
  db.delete(chatSessions).where(eq(chatSessions.id, sessionId)).run();

  return Response.json({ success: true });
}
