import { NextRequest } from "next/server";
import path from "path";
import { streamClaude } from "@/lib/claude-runner";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt } = body;

  if (!prompt) {
    return Response.json(
      { error: "Missing required field: prompt" },
      { status: 400 }
    );
  }

  // Resolve project root (parent of app/)
  const projectCwd = path.join(process.cwd(), "..");
  const stream = streamClaude({ prompt, projectCwd });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
