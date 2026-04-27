/**
 * CORS helpers for clipper-facing endpoints.
 *
 * The web clipper (bookmarklet or browser extension) runs on a third-party
 * origin (e.g. https://en.wikipedia.org) and POSTs to localhost:3000.
 * Safari and Chrome both block cross-origin fetches with `Content-Type:
 * application/json` unless the server returns CORS headers and answers an
 * OPTIONS preflight.
 *
 * The app is documented as localhost-only (no auth) — `*` is fine here.
 * If we ever add auth, tighten this to a configurable origin allowlist.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function withCors(res: Response): Response {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}
