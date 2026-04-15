import { NextRequest } from "next/server";
import { streamClaude } from "@/lib/claude-runner";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, projectCwd } = body;

  if (!prompt || !projectCwd) {
    return Response.json(
      { error: "Missing required fields: prompt, projectCwd" },
      { status: 400 }
    );
  }

  const stream = streamClaude({ prompt, projectCwd });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
