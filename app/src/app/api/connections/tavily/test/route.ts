import { NextRequest } from "next/server";
import { getTavilyKey } from "@/lib/connections";

export async function POST(request: NextRequest) {
  let provided: string | undefined;
  try { provided = ((await request.json()) as { apiKey?: string })?.apiKey?.trim() || undefined; } catch {}
  const key = provided || getTavilyKey();
  if (!key) return Response.json({ ok: false, error: "No Tavily API key configured." }, { status: 400 });
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: "test", max_results: 1 }),
    });
    if (res.ok) return Response.json({ ok: true });
    if (res.status === 401) return Response.json({ ok: false, error: "Invalid Tavily API key." });
    return Response.json({ ok: false, error: `Tavily API returned ${res.status}.` });
  } catch (e) {
    return Response.json({ ok: false, error: `Could not reach Tavily (${(e as Error).message}).` });
  }
}
