import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

const KEY = "anthropic_api_key";

// Validate an Anthropic API key with a cheap authenticated call. An optional
// `apiKey` in the body is tested instead of the stored one (so users can verify
// before saving).
export async function POST(request: NextRequest) {
  let provided: string | undefined;
  try {
    const body = (await request.json()) as { apiKey?: string };
    provided = body?.apiKey?.trim() || undefined;
  } catch {}
  const key = provided || db.select().from(settings).where(eq(settings.key, KEY)).get()?.value?.trim();
  if (!key) return Response.json({ ok: false, error: "No API key configured." }, { status: 400 });

  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (res.ok) return Response.json({ ok: true });
    if (res.status === 401) return Response.json({ ok: false, error: "Invalid API key." });
    return Response.json({ ok: false, error: `Anthropic API returned ${res.status}.` });
  } catch (e) {
    return Response.json({ ok: false, error: `Could not reach the Anthropic API (${(e as Error).message}).` });
  }
}
