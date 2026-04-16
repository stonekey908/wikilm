import { NextRequest } from "next/server";
import path from "path";
import { streamClaude } from "@/lib/claude-runner";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic } = body;

  if (!topic) {
    return Response.json(
      { error: "Missing required field: topic" },
      { status: 400 }
    );
  }

  const prompt = `Search the web for sources about: ${topic}

Output each result as one line: RESULT:{"title":"...","domain":"...","author":"...","type":"Paper|Blog|Article|Survey","summary":"...","relevance":85,"tags":["tag1","tag2"]}

Find 5-8 sources. When done output: DONE`;

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
