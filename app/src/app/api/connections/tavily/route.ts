import { NextRequest } from "next/server";
import { getSetting, setSetting, maskSecret, isMcpEnabled, TAVILY_KEY_SETTING } from "@/lib/connections";

export async function GET() {
  const key = getSetting(TAVILY_KEY_SETTING)?.trim() || "";
  return Response.json({
    configured: !!key,
    maskedKey: key ? maskSecret(key) : null,
    available: isMcpEnabled(),
  });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { apiKey?: string };
  if (typeof body.apiKey === "string") setSetting(TAVILY_KEY_SETTING, body.apiKey.trim());
  const key = getSetting(TAVILY_KEY_SETTING)?.trim() || "";
  return Response.json({ configured: !!key, maskedKey: key ? maskSecret(key) : null, available: isMcpEnabled() });
}
