import { NextRequest } from "next/server";
import { streamClaude } from "@/lib/claude-runner";
import { getProject, projectRoot } from "@/lib/projects";
import { getTavilyKey, isMcpEnabled } from "@/lib/connections";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

interface TavilyResult { title?: string; url?: string; content?: string; score?: number }

// Web search via Tavily. Available when MCP connectivity is enabled and a key
// is set. Streams the same RESULT:{…} lines the Claude path emits, so the UI is
// provider-agnostic.
function tavilyStream(topic: string, maxResults: number, excludeUrls: string[], key: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ query: topic, max_results: maxResults, search_depth: "advanced" }),
        });
        if (!res.ok) {
          send(`data: ${JSON.stringify({ type: "error", text: `Tavily returned ${res.status}` })}\n\n`);
        } else {
          const data = (await res.json()) as { results?: TavilyResult[] };
          const exclude = new Set(excludeUrls);
          for (const r of data.results ?? []) {
            if (!r.url || exclude.has(r.url)) continue;
            let domain = "";
            try { domain = new URL(r.url).hostname.replace(/^www\./, ""); } catch {}
            send(`RESULT:${JSON.stringify({
              title: r.title ?? r.url,
              url: r.url,
              domain,
              author: "",
              type: "Article",
              summary: (r.content ?? "").slice(0, 400),
              relevance: Math.round((r.score ?? 0.6) * 100),
              tags: [],
            })}\n`);
          }
        }
      } catch (e) {
        send(`data: ${JSON.stringify({ type: "error", text: `Tavily unreachable: ${(e as Error).message}` })}\n\n`);
      }
      send("DONE\n");
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

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

  // Prefer Tavily when connectivity is on and a key is configured.
  const tavilyKey = getTavilyKey();
  if (tavilyKey && isMcpEnabled()) {
    return tavilyStream(topic, maxResults, excludeUrls, tavilyKey);
  }

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
