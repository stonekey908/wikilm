"use client";

import { useProject } from "@/components/project-switcher";

/** Active project id (or null until projects load). */
export function useProjectId(): number | null {
  const { activeProject } = useProject();
  return activeProject?.id ?? null;
}

/** Small className joiner. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Read a Server-Sent-Events / line-delimited stream, invoking `onLine` for each
 * non-empty line. Returns when the stream ends or `signal` aborts.
 */
export async function readStream(
  res: Response,
  onLine: (line: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) onLine(line);
      }
    }
    const tail = buffer.trim();
    if (tail) onLine(tail);
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
}

/** Parse a `data: {json}` or bare-json SSE line into an object, or null. */
export function parseSseJson(line: string): Record<string, unknown> | null {
  let s = line;
  if (s.startsWith("data:")) s = s.slice(5).trim();
  if (s === "[DONE]" || s === "DONE") return { done: true };
  if (!s.startsWith("{")) return null;
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Deterministic colour for a domain/string (favicon chips). */
export function hueColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}

export function initialOf(s: string): string {
  return (s.trim()[0] || "?").toUpperCase();
}
