import { NextRequest } from "next/server";
import { getNotionToken, notionHeaders } from "@/lib/notion";

export async function POST(request: NextRequest) {
  let provided: string | undefined;
  try { provided = ((await request.json()) as { token?: string })?.token?.trim() || undefined; } catch {}
  const token = provided || getNotionToken();
  if (!token) return Response.json({ ok: false, error: "No Notion token configured." }, { status: 400 });
  try {
    const res = await fetch("https://api.notion.com/v1/users/me", { headers: notionHeaders(token) });
    if (res.ok) return Response.json({ ok: true });
    if (res.status === 401) return Response.json({ ok: false, error: "Invalid Notion token." });
    return Response.json({ ok: false, error: `Notion API returned ${res.status}.` });
  } catch (e) {
    return Response.json({ ok: false, error: `Could not reach Notion (${(e as Error).message}).` });
  }
}
