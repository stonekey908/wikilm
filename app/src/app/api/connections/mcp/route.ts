import { NextRequest } from "next/server";
import { getSetting, setSetting, isMcpEnabled, MCP_ENABLED_SETTING } from "@/lib/connections";

// The local wikilm MCP server command, surfaced for display in the UI.
const SERVER = "wikilm-mcp · node mcp/dist/index.js (stdio)";

export async function GET() {
  return Response.json({ enabled: isMcpEnabled(), server: getSetting("mcp_server") || SERVER });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { enabled?: boolean };
  if (typeof body.enabled === "boolean") setSetting(MCP_ENABLED_SETTING, body.enabled ? "true" : "false");
  return Response.json({ enabled: isMcpEnabled(), server: getSetting("mcp_server") || SERVER });
}
