import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Generic settings-table accessors shared by the connection endpoints. */
export function getSetting(key: string): string | null {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}
export function setSetting(key: string, value: string): void {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  else db.insert(settings).values({ key, value }).run();
}

/** Mask a secret for display, e.g. "tvly-ab…wxyz". */
export function maskSecret(k: string): string {
  return k.length <= 12 ? "••••" : `${k.slice(0, 7)}…${k.slice(-4)}`;
}

// MCP connectivity is the master switch that gates dependent integrations
// (e.g. Tavily). Defaults to enabled when unset.
export const MCP_ENABLED_SETTING = "mcp_enabled";
export function isMcpEnabled(): boolean {
  return getSetting(MCP_ENABLED_SETTING) !== "false";
}

export const TAVILY_KEY_SETTING = "tavily_api_key";
export function getTavilyKey(): string | null {
  const v = getSetting(TAVILY_KEY_SETTING)?.trim();
  return v ? v : null;
}
