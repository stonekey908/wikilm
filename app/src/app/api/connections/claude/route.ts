import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

const KEY = "anthropic_api_key";
const MODEL = "anthropic_model";
const DEFAULT_MODEL = "claude-opus-4-8";

function get(key: string): string | null {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}
function set(key: string, value: string) {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  else db.insert(settings).values({ key, value }).run();
}
function mask(k: string): string {
  if (k.length <= 12) return "••••";
  return `${k.slice(0, 7)}…${k.slice(-4)}`;
}

export async function GET() {
  const key = get(KEY)?.trim() || "";
  return Response.json({
    configured: !!key,
    maskedKey: key ? mask(key) : null,
    model: get(MODEL) || DEFAULT_MODEL,
  });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { apiKey?: string; model?: string };
  if (typeof body.apiKey === "string") set(KEY, body.apiKey.trim());
  if (typeof body.model === "string" && body.model) set(MODEL, body.model);
  const key = get(KEY)?.trim() || "";
  return Response.json({ configured: !!key, maskedKey: key ? mask(key) : null, model: get(MODEL) || DEFAULT_MODEL });
}
