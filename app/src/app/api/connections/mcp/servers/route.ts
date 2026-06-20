import { NextRequest } from "next/server";
import { getMcpServers, setMcpServers, type McpServerDef } from "@/lib/mcp-client";

export async function GET() {
  return Response.json({ servers: getMcpServers() });
}

// Replace the registry. Body: { servers: McpServerDef[] }.
export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { servers?: McpServerDef[] };
  const servers = Array.isArray(body.servers)
    ? body.servers
        .filter((s) => s && typeof s.name === "string")
        .map((s) => ({
          id: s.id || Math.random().toString(36).slice(2, 9),
          name: s.name,
          transport: s.transport === "http" ? "http" : "stdio",
          command: s.command,
          url: s.url,
          enabled: s.enabled !== false,
        } as McpServerDef))
    : [];
  setMcpServers(servers);
  return Response.json({ servers });
}
