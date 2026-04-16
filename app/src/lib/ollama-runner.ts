/**
 * Ollama runner — parallel provider path alongside claude-runner.ts spawn flow.
 * Purely additive: the Claude spawn logic is untouched. Jobs routed here by
 * checking whether the model setting starts with "ollama:".
 */

import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

const OLLAMA_BASE = "http://localhost:11434";

// Track in-flight Ollama requests so cancelJob can abort them
const ollamaControllers = new Map<number, AbortController>();

export interface OllamaModel {
  id: string; // e.g. "ollama:qwen2.5-coder:7b"
  name: string; // display name e.g. "qwen2.5-coder:7b"
  contextWindow: number;
}

/**
 * Detect which Ollama models are installed locally.
 * Returns empty array if Ollama isn't running (silent failure is fine here).
 */
export async function detectOllamaModels(): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { models?: { name: string }[] };
    if (!data.models?.length) return [];

    const models: OllamaModel[] = [];
    for (const m of data.models) {
      let contextWindow = 131072;
      try {
        const showRes = await fetch(`${OLLAMA_BASE}/api/show`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: m.name }),
          signal: AbortSignal.timeout(2000),
        });
        if (showRes.ok) {
          const showData = (await showRes.json()) as {
            model_info?: Record<string, unknown>;
          };
          const ctxKey = Object.keys(showData.model_info ?? {}).find((k) =>
            k.includes("context_length")
          );
          if (ctxKey && showData.model_info) {
            contextWindow = Number(showData.model_info[ctxKey]) || contextWindow;
          }
        }
      } catch {
        // keep default context window
      }
      models.push({
        id: `ollama:${m.name}`,
        name: m.name,
        contextWindow,
      });
    }
    return models;
  } catch {
    return [];
  }
}

/**
 * Run an Ollama job. Mirrors what spawnJob does for Claude:
 *   - marks the job running
 *   - streams response into the jobs.output column
 *   - on completion, sets status + calls onComplete
 */
export function runOllamaJob(
  jobId: number,
  options: {
    prompt: string;
    model: string; // bare model name, no "ollama:" prefix
    onComplete?: (status: "completed" | "failed") => void;
  },
  onFinish: () => void // called after success/failure/abort so the caller can drain the queue
): void {
  db.update(jobs)
    .set({ status: "running", startedAt: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();

  const controller = new AbortController();
  ollamaControllers.set(jobId, controller);

  let output = "";

  (async () => {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options.model,
          prompt: options.prompt,
          stream: true,
          options: { temperature: 0.3 },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Ollama responded with ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line) as { response?: string; done?: boolean };
            if (evt.response) {
              output += evt.response;
              db.update(jobs).set({ output }).where(eq(jobs.id, jobId)).run();
            }
          } catch {
            // skip malformed line
          }
        }
      }

      // Check if the job was cancelled mid-stream before marking complete
      const current = db
        .select({ status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .get();
      if (current?.status === "cancelled" || current?.status === "completed") return;

      db.update(jobs)
        .set({
          status: "completed",
          output,
          completedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, jobId))
        .run();
      options.onComplete?.("completed");
    } catch (err: unknown) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      const current = db
        .select({ status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .get();
      // If already cancelled (user clicked stop), leave that status alone
      if (current?.status === "cancelled") {
        options.onComplete?.("failed");
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      db.update(jobs)
        .set({
          status: aborted ? "cancelled" : "failed",
          error: aborted ? "Aborted" : message,
          output,
          completedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, jobId))
        .run();
      options.onComplete?.("failed");
    } finally {
      ollamaControllers.delete(jobId);
      onFinish();
    }
  })();
}

/**
 * Cancel an in-flight Ollama job. Returns true if the job was found and aborted.
 */
export function cancelOllamaJob(jobId: number): boolean {
  const controller = ollamaControllers.get(jobId);
  if (!controller) return false;
  controller.abort();
  ollamaControllers.delete(jobId);
  db.update(jobs)
    .set({ status: "cancelled", completedAt: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();
  return true;
}

/** True if there's an in-flight Ollama job with this id. */
export function hasOllamaJob(jobId: number): boolean {
  return ollamaControllers.has(jobId);
}
