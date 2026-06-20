import { NextRequest } from "next/server";

/**
 * Opt-in write-token enforcement for endpoints that mutate state.
 *
 * When `WIKILM_WRITE_TOKEN` is unset (default), this is a no-op so the app's own
 * UI keeps working without a token. When it IS set, every guarded write must
 * present a matching `X-WikiLM-Write-Token` header — this is how the MCP server
 * (and any remote caller) is authorised. Returns a 401 Response to short-circuit
 * the handler, or null to proceed.
 */
export function checkWriteToken(request: NextRequest): Response | null {
  const required = process.env.WIKILM_WRITE_TOKEN;
  if (!required) return null;
  const got = request.headers.get("x-wikilm-write-token");
  if (got !== required) {
    return Response.json({ error: "Unauthorized write: missing or invalid X-WikiLM-Write-Token." }, { status: 401 });
  }
  return null;
}
