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

  const prompt = `Search the web for high-quality sources about: ${topic}

For each source you find, output EXACTLY one JSON line in this format (no other text before or after each JSON line):
RESULT:{"title":"...","domain":"...","author":"...","type":"Paper|Blog|Article|Book|Survey","summary":"...","relevance":85,"tags":["tag1","tag2"]}

Find 5-8 relevant sources. Focus on academic papers, authoritative blogs, and high-quality articles. After all results, output: DONE`;

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
