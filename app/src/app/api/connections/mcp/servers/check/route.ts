import { NextRequest } from "next/server";
import { connectAndList, getMcpServers, type McpServerDef } from "@/lib/mcp-client";
import { isMcpEnabled } from "@/lib/connections";

// Health check: connect to a registered (or inline) external MCP server and
// list its tools. Gated on the MCP connectivity master switch.
export async function POST(request: NextRequest) {
  if (!isMcpEnabled()) return Response.json({ ok: false, error: "MCP connectivity is disabled." }, { status: 400 });
  const body = (await request.json()) as { id?: string; server?: McpServerDef };
  const def = body.server ?? getMcpServers().find((s) => s.id === body.id);
  if (!def) return Response.json({ ok: false, error: "Server not found." }, { status: 404 });
  const result = await connectAndList(def);
  return Response.json(result);
}
