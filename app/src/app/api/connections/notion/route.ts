import { NextRequest } from "next/server";
import { getSetting, setSetting, maskSecret } from "@/lib/connections";
import { NOTION_TOKEN_SETTING, NOTION_PARENT_SETTING, NOTION_LAST_SYNC, NOTION_DIRECTION_SETTING, getNotionDirection } from "@/lib/notion";

function status() {
  const token = getSetting(NOTION_TOKEN_SETTING)?.trim() || "";
  return {
    configured: !!token,
    maskedToken: token ? maskSecret(token) : null,
    parent: getSetting(NOTION_PARENT_SETTING) || null,
    direction: getNotionDirection(),
    lastSync: getSetting(NOTION_LAST_SYNC) || null,
  };
}

export async function GET() {
  return Response.json(status());
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { token?: string; parent?: string; direction?: string };
  if (typeof body.token === "string") setSetting(NOTION_TOKEN_SETTING, body.token.trim());
  if (typeof body.parent === "string") setSetting(NOTION_PARENT_SETTING, body.parent.trim());
  if (body.direction === "push" || body.direction === "pull" || body.direction === "two-way") setSetting(NOTION_DIRECTION_SETTING, body.direction);
  return Response.json(status());
}
