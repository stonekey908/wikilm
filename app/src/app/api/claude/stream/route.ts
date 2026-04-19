import { NextRequest } from "next/server";
import { streamClaude } from "@/lib/claude-runner";
import { getProject, projectRoot } from "@/lib/projects";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt } = body;

  if (!prompt) {
    return Response.json(
      { error: "Missing required field: prompt" },
      { status: 400 }
    );
  }

  // Smart context routing: tell Claude to consult the wiki map + synthesis first,
  // then only read specific pages that are actually relevant to the question.
  // Keeps chat context small (~2-3K tokens instead of 50K+) and traceable.
  const wrappedPrompt = `You are answering questions against a personal wiki at wiki/.

Before answering, do this EXACTLY:
1. Read wiki/index.md — this is the map of every page that exists
2. Read wiki/synthesis/project-overview.md if it exists — this is a 500-word overview of the whole wiki
3. Based on the user's question, identify 1-5 specific pages from the index that are most relevant
4. Read ONLY those specific pages. Do NOT read every page.
5. If a page you read references a [[wikilink]] that is genuinely needed to answer, follow it

Then answer the user's question. Cite which wiki pages you consulted (e.g. "From [[andrej-karpathy]] and [[vibe-coding]]..."). Be direct and specific — don't summarize the whole wiki, answer the actual question.

If the index or synthesis do not exist yet, say so and answer from whatever you can find in wiki/.

---

User question: ${prompt}`;

  const targetProjectId = body?.projectId ?? 1;
  const project = getProject(targetProjectId) ?? getProject(1);
  if (!project) {
    return Response.json({ error: "No project found" }, { status: 404 });
  }
  const projectCwd = projectRoot(project);
  const stream = streamClaude({ prompt: wrappedPrompt, projectCwd, type: "chat" });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
