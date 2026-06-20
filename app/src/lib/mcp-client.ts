import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getSetting, setSetting } from "@/lib/connections";

export interface McpServerDef {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string; // stdio, e.g. "node /path/dist/index.js" or "npx -y @notionhq/notion-mcp-server"
  url?: string; // http(s) endpoint
  enabled: boolean;
}

export const MCP_SERVERS_SETTING = "mcp_servers";

export function getMcpServers(): McpServerDef[] {
  try { return JSON.parse(getSetting(MCP_SERVERS_SETTING) || "[]"); } catch { return []; }
}
export function setMcpServers(list: McpServerDef[]): void {
  setSetting(MCP_SERVERS_SETTING, JSON.stringify(list));
}

export interface McpToolInfo { name: string; description?: string }

/**
 * Connect to an external MCP server (as a client), list its tools, and
 * disconnect. This is the outbound MCP connectivity: wikiLM consuming other
 * servers (Notion, Tavily, …). Returns a health result for the Connections UI.
 */
export async function connectAndList(
  def: McpServerDef,
  timeoutMs = 8000,
): Promise<{ ok: boolean; tools?: McpToolInfo[]; error?: string }> {
  let transport: StdioClientTransport | StreamableHTTPClientTransport;
  try {
    if (def.transport === "http") {
      if (!def.url) return { ok: false, error: "No URL configured." };
      transport = new StreamableHTTPClientTransport(new URL(def.url));
    } else {
      if (!def.command) return { ok: false, error: "No command configured." };
      const parts = def.command.trim().split(/\s+/);
      transport = new StdioClientTransport({ command: parts[0], args: parts.slice(1) });
    }
  } catch (e) {
    return { ok: false, error: `Bad transport config: ${(e as Error).message}` };
  }

  const client = new Client({ name: "wikilm", version: "0.1.0" }, { capabilities: {} });
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("connection timed out")), timeoutMs));
  try {
    await Promise.race([client.connect(transport), timeout]);
    const { tools } = await client.listTools();
    return { ok: true, tools: tools.map((t) => ({ name: t.name, description: t.description })) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  } finally {
    try { await client.close(); } catch {}
  }
}
