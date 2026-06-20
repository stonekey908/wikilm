import { NextRequest } from "next/server";
import { getSetting, setSetting, maskSecret } from "@/lib/connections";
import { NOTION_TOKEN_SETTING, NOTION_PARENT_SETTING, NOTION_LAST_SYNC } from "@/lib/notion";

export async function GET() {
  const token = getSetting(NOTION_TOKEN_SETTING)?.trim() || "";
  return Response.json({
    configured: !!token,
    maskedToken: token ? maskSecret(token) : null,
    parent: getSetting(NOTION_PARENT_SETTING) || null,
    lastSync: getSetting(NOTION_LAST_SYNC) || null,
  });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { token?: string; parent?: string };
  if (typeof body.token === "string") setSetting(NOTION_TOKEN_SETTING, body.token.trim());
  if (typeof body.parent === "string") setSetting(NOTION_PARENT_SETTING, body.parent.trim());
  const token = getSetting(NOTION_TOKEN_SETTING)?.trim() || "";
  return Response.json({
    configured: !!token,
    maskedToken: token ? maskSecret(token) : null,
    parent: getSetting(NOTION_PARENT_SETTING) || null,
    lastSync: getSetting(NOTION_LAST_SYNC) || null,
  });
}
