import { NextRequest } from "next/server";
import { streamClaude } from "@/lib/claude-runner";
import { getProject, projectRoot } from "@/lib/projects";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic } = body;

  if (!topic) {
    return Response.json(
      { error: "Missing required field: topic" },
      { status: 400 }
    );
  }

  const maxResults = body.maxResults ?? 8;
  const excludeUrls: string[] = Array.isArray(body.excludeUrls)
    ? body.excludeUrls.filter((u: unknown): u is string => typeof u === "string")
    : [];

  const excludeBlock =
    excludeUrls.length > 0
      ? `\n\nALREADY SUGGESTED — do NOT return any of these URLs:\n${excludeUrls.map((u) => `- ${u}`).join("\n")}`
      : "";

  const prompt = `Search the web for sources about: ${topic}${excludeBlock}

Output each result as one line: RESULT:{"title":"...","url":"...","domain":"...","author":"...","type":"Paper|Blog|Article|Survey","summary":"...","relevance":85,"tags":["tag1","tag2"]}

IMPORTANT: Include the actual URL for each source. Find exactly ${maxResults} sources maximum. When done output: DONE`;

  const targetProjectId = body?.projectId ?? 1;
  const project = getProject(targetProjectId) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "No project found" }, { status: 404 });
  }
  const projectCwd = projectRoot(project);
  const stream = streamClaude({ prompt, projectCwd, type: "research" });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
