import { NextRequest } from "next/server";
import { getSetting, setSetting } from "@/lib/connections";

const PATH_KEY = "obsidian_vault_path";
const LAST_KEY = "obsidian_last_export";

export async function GET() {
  const vaultPath = getSetting(PATH_KEY) || "";
  return Response.json({
    configured: !!vaultPath,
    vaultPath: vaultPath || null,
    lastExport: getSetting(LAST_KEY) || null,
  });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { vaultPath?: string };
  if (typeof body.vaultPath === "string") setSetting(PATH_KEY, body.vaultPath.trim());
  const vaultPath = getSetting(PATH_KEY) || "";
  return Response.json({ configured: !!vaultPath, vaultPath: vaultPath || null, lastExport: getSetting(LAST_KEY) || null });
}
