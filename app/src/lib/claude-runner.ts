import { spawn, type ChildProcess } from "child_process";
import { db } from "@/db";
import { jobs, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMockStream, getMockResponse } from "@/lib/__mocks__/claude-mock";
import { runOllamaJob, cancelOllamaJob, hasOllamaJob } from "@/lib/ollama-runner";
import { runGeminiJob, cancelGeminiJob, hasGeminiJob, isGeminiAvailable } from "@/lib/gemini-runner";

export const isMockMode = process.env.MOCK_MODE === "true";

const MAX_CONCURRENT_JOBS = 3;

// Queue of jobs waiting to start
const jobQueue: Array<{ jobId: number; options: JobOptions }> = [];

/**
 * Total in-flight jobs (Claude subprocesses + Ollama HTTP requests).
 * Ollama controller count is resolved via hasOllamaJob() — but since we
 * can't enumerate the Map from here, we track a running total separately.
 */
let inFlightOllamaCount = 0;
let inFlightGeminiCount = 0;

/**
 * Try to start the next queued job if there's capacity.
 */
function drainQueue() {
  while (
    runningProcesses.size + inFlightOllamaCount + inFlightGeminiCount < MAX_CONCURRENT_JOBS &&
    jobQueue.length > 0
  ) {
    const next = jobQueue.shift()!;
    startJobProcess(next.jobId, next.options);
  }
}

/**
 * Dispatch a job to the right provider based on its resolved model setting.
 * "ollama:<model>" -> Ollama HTTP; anything else -> Claude spawn.
 */
function startJobProcess(jobId: number, options: JobOptions): void {
  const model = getModel(options.type);
  console.log(`[job:${jobId}] type=${options.type} model=${model}`);
  if (model.startsWith("ollama:")) {
    const modelName = model.slice("ollama:".length);
    inFlightOllamaCount++;
    runOllamaJob(
      jobId,
      {
        prompt: options.prompt,
        model: modelName,
        onComplete: options.onComplete,
      },
      () => {
        inFlightOllamaCount = Math.max(0, inFlightOllamaCount - 1);
        drainQueue();
      }
    );
    return;
  }
  if (model.startsWith("gemini:")) {
    const modelName = model.slice("gemini:".length);
    inFlightGeminiCount++;
    runGeminiJob(
      jobId,
      {
        prompt: options.prompt,
        model: modelName,
        projectCwd: options.projectCwd,
        onComplete: options.onComplete,
      },
      () => {
        inFlightGeminiCount = Math.max(0, inFlightGeminiCount - 1);
        drainQueue();
      }
    );
    return;
  }
  spawnJob(jobId, options);
}

// Model configuration: DB settings > env vars > default (sonnet)
const ENV_MODELS: Record<string, string | undefined> = {
  ingest: process.env.CLAUDE_MODEL_INGEST ?? process.env.CLAUDE_MODEL,
  research: process.env.CLAUDE_MODEL_RESEARCH ?? process.env.CLAUDE_MODEL,
  query: process.env.CLAUDE_MODEL_QUERY ?? process.env.CLAUDE_MODEL,
  lint: process.env.CLAUDE_MODEL_LINT ?? process.env.CLAUDE_MODEL,
  fix: process.env.CLAUDE_MODEL_FIX ?? process.env.CLAUDE_MODEL,
  chat: process.env.CLAUDE_MODEL_CHAT ?? process.env.CLAUDE_MODEL,
  synthesis: process.env.CLAUDE_MODEL_SYNTHESIS ?? process.env.CLAUDE_MODEL,
};

/**
 * Resolve the model setting for a given operation type.
 * Returns raw value — may be a Claude alias (e.g. "sonnet") or an Ollama id
 * ("ollama:qwen2.5-coder:7b"). Caller dispatches based on the prefix.
 */
function getModel(type: string): string {
  const key = `model_${type}`;
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? ENV_MODELS[type] ?? "sonnet";
}

function getModelArgs(type: string): string[] {
  return ["--model", getModel(type)];
}

// Track running processes by job ID
const runningProcesses = new Map<number, ChildProcess>();

interface StreamOptions {
  prompt: string;
  projectCwd: string;
  type?: string;
}

interface JobOptions {
  prompt: string;
  projectCwd: string;
  projectId: number;
  type: "ingest" | "query" | "lint" | "fix" | "research" | "synthesis";
  title: string;
  onComplete?: (status: "completed" | "failed") => void;
}

/**
 * Get the count of currently running jobs
 */
export function getRunningJobCount(): number {
  return runningProcesses.size + inFlightOllamaCount + inFlightGeminiCount;
}

/**
 * Stream mode — returns a ReadableStream of SSE data.
 * Used for real-time chat + research responses.
 *
 * Dispatches based on the operation's configured model:
 *   "gemini:<model>" → `gemini` CLI subprocess
 *   "ollama:<model>" → surfaced error (HTTP flow doesn't fit our SSE envelope)
 *   anything else   → `claude` CLI subprocess (default)
 *
 * The controller enqueues `{ type: "content"|"error"|"done" }` frames in the
 * same shape regardless of provider, so clients don't branch on backend.
 */
export function streamClaude({ prompt, projectCwd, type }: StreamOptions): ReadableStream {
  if (isMockMode) {
    const type = prompt.toLowerCase().includes("ingest")
      ? "ingest"
      : prompt.toLowerCase().includes("lint")
        ? "lint"
        : prompt.toLowerCase().includes("research")
          ? "research"
          : "query";
    return createMockStream(type);
  }

  const encoder = new TextEncoder();
  const model = getModel(type ?? "chat");
  // Audit line — makes it trivial to confirm which provider drove any
  // given stream via the dev server log.
  console.log(`[stream] type=${type ?? "chat"} model=${model}`);

  // Ollama doesn't plug into this SSE envelope yet — surface a clean error
  // instead of letting the user wonder why nothing happened.
  if (model.startsWith("ollama:")) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              text: "Ollama streaming isn't supported for research/chat yet. Pick Claude or Gemini for this operation.",
            })}\n\n`
          )
        );
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", code: 1 })}\n\n`));
        controller.close();
      },
    });
  }

  // Gemini: spawn the gemini CLI with its equivalent flags.
  // Claude: keep the existing spawn/flags.
  const isGemini = model.startsWith("gemini:");
  const cmd = isGemini ? "gemini" : "claude";
  const args = isGemini
    ? ["-p", prompt, "-m", model.slice("gemini:".length), "-y", "-o", "text"]
    : [
        "-p",
        prompt,
        ...getModelArgs(type ?? "chat"),
        "--allowedTools",
        "Write",
        "Edit",
        "Read",
        "WebSearch",
        "WebFetch",
        "Bash(ls:*)",
        "Bash(mkdir:*)",
      ];

  return new ReadableStream({
    start(controller) {
      const proc = spawn(cmd, args, {
        cwd: projectCwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      });

      let buffer = "";

      proc.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.trim()) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "content", text: line })}\n\n`)
            );
          }
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", text })}\n\n`)
        );
      });

      proc.on("close", (code) => {
        if (buffer.trim()) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "content", text: buffer })}\n\n`)
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", code })}\n\n`)
        );
        controller.close();
      });

      proc.on("error", (err) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`
          )
        );
        controller.close();
      });
    },
  });
}

/**
 * Spawn a process for an existing job record.
 */
function spawnJob(jobId: number, options: JobOptions): void {
  db.update(jobs)
    .set({ status: "running", startedAt: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();

  const proc = spawn("claude", [
    "-p", options.prompt,
    ...getModelArgs(options.type),
    "--allowedTools", "Write", "Edit", "Read", "WebSearch", "WebFetch", "Bash(ls:*)", "Bash(mkdir:*)",
  ], {
    cwd: options.projectCwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  runningProcesses.set(jobId, proc);

  // Update PID
  db.update(jobs).set({ pid: proc.pid }).where(eq(jobs.id, jobId)).run();

  let output = "";
  let error = "";

  proc.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
    const progress = parseProgress(output);
    if (progress) {
      db.update(jobs)
        .set({ progress: JSON.stringify(progress), output })
        .where(eq(jobs.id, jobId))
        .run();
    } else {
      db.update(jobs).set({ output }).where(eq(jobs.id, jobId)).run();
    }
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    error += chunk.toString();
    db.update(jobs).set({ error }).where(eq(jobs.id, jobId)).run();
  });

  proc.on("close", (code) => {
    runningProcesses.delete(jobId);
    // Don't overwrite if already cancelled/completed
    const current = db.select({ status: jobs.status }).from(jobs).where(eq(jobs.id, jobId)).get();
    if (current?.status === "cancelled" || current?.status === "completed") {
      drainQueue();
      return;
    }
    const finalStatus = code === 0 ? "completed" : "failed";
    db.update(jobs)
      .set({
        status: finalStatus,
        output,
        error: error || null,
        completedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId))
      .run();
    options.onComplete?.(finalStatus);
    drainQueue();
  });

  proc.on("error", (err) => {
    runningProcesses.delete(jobId);
    db.update(jobs)
      .set({
        status: "failed",
        error: err.message,
        completedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId))
      .run();
    options.onComplete?.("failed");
    drainQueue();
  });
}

/**
 * Verify the chosen model's provider is reachable before spawning a job.
 * Returns { ok: true } for Claude (trusted — it's an install prerequisite)
 * and for any provider we don't yet know how to check. For Ollama, does a
 * 1-second HEAD to /api/tags. Returns a classified error on failure.
 */
async function preflightProvider(model: string): Promise<
  | { ok: true }
  | { ok: false; code: string; error: string }
> {
  if (model.startsWith("ollama:")) {
    try {
      const res = await fetch("http://localhost:11434/api/tags", {
        signal: AbortSignal.timeout(1000),
      });
      if (!res.ok) {
        return {
          ok: false,
          code: "provider_unavailable",
          error: `Ollama responded with HTTP ${res.status}. Is it running and healthy?`,
        };
      }
      return { ok: true };
    } catch {
      return {
        ok: false,
        code: "provider_unavailable",
        error: "Ollama is not running. Start it with `ollama serve`.",
      };
    }
  }
  if (model.startsWith("gemini:")) {
    const available = await isGeminiAvailable();
    if (!available) {
      return {
        ok: false,
        code: "provider_unavailable",
        error:
          "Gemini CLI is not installed. Install with `npm i -g @google/gemini-cli` and authenticate with `gemini` once.",
      };
    }
    return { ok: true };
  }
  // Claude — trusted (it's the install prerequisite), no check
  return { ok: true };
}

/**
 * Background job mode — spawns process or queues if at capacity.
 * Used for ingest, lint, research operations.
 */
export async function startJob(options: JobOptions): Promise<number> {
  // Mock mode: simulate a job with fake output
  if (isMockMode) {
    const result = db
      .insert(jobs)
      .values({
        projectId: options.projectId,
        type: options.type,
        title: options.title,
        status: "running",
        startedAt: new Date().toISOString(),
      })
      .returning({ id: jobs.id })
      .all();

    const jobId = result[0].id;
    const lines = getMockResponse(options.type);

    // Simulate async progress
    (async () => {
      for (let i = 0; i < lines.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        db.update(jobs)
          .set({
            output: lines.slice(0, i + 1).join("\n"),
            progress: JSON.stringify({ current: i + 1, total: lines.length }),
          })
          .where(eq(jobs.id, jobId))
          .run();
      }
      db.update(jobs)
        .set({
          status: "completed",
          output: lines.join("\n"),
          completedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, jobId))
        .run();
      options.onComplete?.("completed");
    })();

    return jobId;
  }

  // Pre-flight the selected provider. If the model can't be reached, insert
  // the job as already-failed with a classified errorCode so the UI can
  // show a helpful message instead of a silent failure.
  const model = getModel(options.type);
  const preflight = await preflightProvider(model);
  if (!preflight.ok) {
    const now = new Date().toISOString();
    const result = db
      .insert(jobs)
      .values({
        projectId: options.projectId,
        type: options.type,
        title: options.title,
        status: "failed",
        error: preflight.error,
        errorCode: preflight.code,
        startedAt: now,
        completedAt: now,
      })
      .returning({ id: jobs.id })
      .all();
    const jobId = result[0].id;
    options.onComplete?.("failed");
    return jobId;
  }

  // Create job record
  const isQueued =
    runningProcesses.size + inFlightOllamaCount + inFlightGeminiCount >= MAX_CONCURRENT_JOBS;
  const result = db
    .insert(jobs)
    .values({
      projectId: options.projectId,
      type: options.type,
      title: options.title,
      status: isQueued ? "queued" : "running",
      startedAt: isQueued ? null : new Date().toISOString(),
    })
    .returning({ id: jobs.id })
    .all();

  const jobId = result[0].id;

  if (isQueued) {
    jobQueue.push({ jobId, options });
  } else {
    startJobProcess(jobId, options);
  }

  return jobId;
}

/**
 * Check if a process is still alive.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // signal 0 = test if process exists
    return true;
  } catch {
    return false;
  }
}

/**
 * Send SIGTERM, then SIGKILL after 3s if still alive.
 */
function killWithEscalation(pid: number): void {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return; // already dead
  }

  setTimeout(() => {
    if (isProcessAlive(pid)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // already dead
      }
    }
  }, 3000);
}

/**
 * On server startup, find jobs stuck in "running" state.
 * If the PID is dead, mark as failed. If alive, kill it.
 */
export function cleanupOrphanedJobs(): void {
  const staleJobs = db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "running"))
    .all();

  for (const job of staleJobs) {
    if (!job.pid || !isProcessAlive(job.pid)) {
      db.update(jobs)
        .set({
          status: "failed",
          error: "Process orphaned — cleaned up on server restart",
          completedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, job.id))
        .run();
    } else {
      killWithEscalation(job.pid);
      db.update(jobs)
        .set({
          status: "cancelled",
          error: "Orphaned process killed on server restart",
          completedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, job.id))
        .run();
    }
  }

  if (staleJobs.length > 0) {
    console.log(`[cleanup] Resolved ${staleJobs.length} orphaned job(s)`);
  }
}

/**
 * Cancel a running job. Tries in-memory process first, falls back to PID from DB.
 * Sends SIGTERM, then SIGKILL after 3s if the process is still alive.
 * Also handles Ollama jobs via AbortController.
 */
export function cancelJob(jobId: number): boolean {
  // Ollama path — no PID, abort the fetch
  if (hasOllamaJob(jobId)) {
    return cancelOllamaJob(jobId);
  }
  // Gemini path — subprocess, SIGTERM → SIGKILL escalation inside
  if (hasGeminiJob(jobId)) {
    return cancelGeminiJob(jobId);
  }

  // Queued job (neither spawned nor streaming yet) — drop from queue + mark cancelled
  const queuedIdx = jobQueue.findIndex((q) => q.jobId === jobId);
  if (queuedIdx !== -1) {
    jobQueue.splice(queuedIdx, 1);
    db.update(jobs)
      .set({ status: "cancelled", completedAt: new Date().toISOString() })
      .where(eq(jobs.id, jobId))
      .run();
    return true;
  }

  const proc = runningProcesses.get(jobId);

  if (proc) {
    if (proc.pid) {
      killWithEscalation(proc.pid);
    }
    runningProcesses.delete(jobId);
  } else {
    // Fallback: look up PID from database
    const job = db.select({ pid: jobs.pid, status: jobs.status }).from(jobs).where(eq(jobs.id, jobId)).get();
    if (!job || !job.pid || (job.status !== "running" && job.status !== "queued")) return false;

    if (!isProcessAlive(job.pid)) {
      // Process already dead — just update status
      db.update(jobs)
        .set({ status: "failed", error: "Process died unexpectedly", completedAt: new Date().toISOString() })
        .where(eq(jobs.id, jobId))
        .run();
      return true;
    }

    killWithEscalation(job.pid);
  }

  db.update(jobs)
    .set({ status: "cancelled", completedAt: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();

  return true;
}

/**
 * Try to extract progress info from Claude's output.
 * Looks for patterns like "Processing 3/12 pages" or similar.
 */
/**
 * On server shutdown, kill all tracked running processes.
 */
function handleShutdown() {
  for (const [jobId, proc] of runningProcesses) {
    try {
      if (proc.pid) {
        process.kill(proc.pid, "SIGKILL"); // immediate — server is going down
      }
    } catch {
      // already dead
    }
    db.update(jobs)
      .set({ status: "cancelled", error: "Server shutdown", completedAt: new Date().toISOString() })
      .where(eq(jobs.id, jobId))
      .run();
  }
  runningProcesses.clear();
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

function parseProgress(output: string): { current: number; total: number } | null {
  const lines = output.split("\n").reverse();
  for (const line of lines) {
    const match = line.match(/(\d+)\s*[/of]+\s*(\d+)/i);
    if (match) {
      return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
    }
  }
  return null;
}

// ─── Synthesis coalescing ──────────────────────────────────────────────────
// Multiple ingests finishing in quick succession shouldn't spawn N synthesis
// jobs — one is enough to capture the current state. We track a single
// in-flight synthesis and a "pending" flag. Any trigger while one is in-flight
// flips the flag; on completion, if pending, we fire exactly one more run to
// capture anything that finished during the in-flight read. This converges
// to at most 2 runs regardless of how many ingests completed in a burst.
let synthesisInFlight = false;
let synthesisPending = false;
let lastProjectCwd: string | null = null;
let lastProjectId: number | null = null;

const SYNTHESIS_PROMPT = `Update the project-wide synthesis page at wiki/synthesis/project-overview.md.

Process:
1. Read wiki/index.md to see what pages exist
2. If wiki/synthesis/project-overview.md exists, read it first — you are refining it, not rewriting from scratch
3. Update the synthesis to reflect the current state of the wiki

Constraints:
- Maximum 500 words in the body (not counting frontmatter)
- Must include YAML frontmatter: type: synthesis, tags, sources (list of referenced source pages)
- Cover: main topics, key entities, major concepts, contradictions between sources, knowledge gaps
- Link all mentions to their wiki pages using [[wikilinks]]
- Write for someone who wants the "big picture" in under 2 minutes of reading
- Preserve useful framing from the previous synthesis where still accurate

After updating, also update wiki/index.md if this synthesis wasn't already listed, and append an entry to wiki/log.md.`;

function scheduleSynthesisJob(projectCwd: string, projectId: number): Promise<number> {
  synthesisInFlight = true;
  synthesisPending = false;
  return startJob({
    prompt: SYNTHESIS_PROMPT,
    projectCwd,
    projectId,
    type: "synthesis",
    title: "Update project synthesis",
    onComplete: () => {
      synthesisInFlight = false;
      // If any ingest finished during this run, fire exactly one more pass
      if (synthesisPending && lastProjectCwd && lastProjectId !== null) {
        scheduleSynthesisJob(lastProjectCwd, lastProjectId).catch((err) => {
          console.error("[synthesis] follow-up run failed:", err);
        });
      }
    },
  });
}

/**
 * Trigger a synthesis update. Coalesces rapid-fire triggers so at most one
 * synthesis is queued/running at any time, plus at most one follow-up to
 * capture ingests that completed during the in-flight run.
 *
 * Returns the jobId of the newly scheduled synthesis, or null if the caller
 * was coalesced into an already-in-flight run.
 */
export async function triggerSynthesisUpdate(
  projectCwd: string,
  projectId: number
): Promise<number | null> {
  // Remember the latest project — the follow-up run uses these
  lastProjectCwd = projectCwd;
  lastProjectId = projectId;

  if (synthesisInFlight) {
    synthesisPending = true;
    return null;
  }
  return scheduleSynthesisJob(projectCwd, projectId);
}

// ─── Parent synthesis coalescing ───────────────────────────────────────────
// Mirrors the child-synthesis coalescing above, but with its own in-flight /
// pending pair so the two trigger paths don't interfere. Parent synthesis
// reads each direct child's `wiki/synthesis/project-overview.md` plus the
// parent's own current overview (if any) and produces a consolidated
// summary-of-summaries. It does NOT read children's raw pages.
let parentSynthesisInFlight = false;
let parentSynthesisPending = false;
let lastParentProjectCwd: string | null = null;
let lastParentProjectId: number | null = null;

const PARENT_SYNTHESIS_PROMPT = `Update the PARENT-level synthesis page at wiki/synthesis/project-overview.md.

You are synthesizing across child projects — NOT this project's own raw sources. Read ONLY the following:
1. This project's existing wiki/synthesis/project-overview.md, if it exists (you are refining it, not rewriting from scratch).
2. Each direct child project's wiki/synthesis/project-overview.md. Children live at ../projects/<child-slug>/wiki/synthesis/project-overview.md relative to this project's wiki/, OR if this project is the root (id=1), children live at ./projects/<child-slug>/wiki/synthesis/project-overview.md. Read whichever path exists.

Do NOT read children's raw/ directories. Do NOT read children's source/entity/concept pages. Children's syntheses are your only input — this is a "summary of summaries".

Produce a consolidated parent-level overview that covers:
- Cross-cutting themes that appear in 2+ children's syntheses
- Patterns, frameworks, or methods recurring across children
- Contradictions between children's conclusions
- Gaps surfaced across children (topics implied but never developed in any child)
- The overall narrative arc — how the children fit together into a bigger picture

Constraints:
- Maximum 600 words in the body (not counting frontmatter)
- Must include YAML frontmatter: type: synthesis, tags, sources (list the children's synthesis page paths you read, e.g. [projects/child-a/wiki/synthesis/project-overview.md])
- Use [[wikilinks]] for cross-references to child project pages using the cross-project syntax [[child-slug/page-name]]
- Write for someone who wants the "big picture across the whole project tree" in 2-3 minutes of reading
- Preserve useful framing from the previous parent synthesis where still accurate

After updating, also update wiki/index.md if this synthesis wasn't already listed, and append an entry to wiki/log.md with operation "update" noting this was a parent-level refresh.`;

function scheduleParentSynthesisJob(
  projectCwd: string,
  projectId: number
): Promise<number> {
  parentSynthesisInFlight = true;
  parentSynthesisPending = false;
  return startJob({
    prompt: PARENT_SYNTHESIS_PROMPT,
    projectCwd,
    projectId,
    type: "synthesis",
    title: "Update parent synthesis",
    onComplete: () => {
      parentSynthesisInFlight = false;
      if (
        parentSynthesisPending &&
        lastParentProjectCwd &&
        lastParentProjectId !== null
      ) {
        scheduleParentSynthesisJob(
          lastParentProjectCwd,
          lastParentProjectId
        ).catch((err) => {
          console.error("[parent-synthesis] follow-up run failed:", err);
        });
      }
    },
  });
}

/**
 * Trigger a parent-level synthesis update. Reads children's syntheses only
 * (not their raw pages) and writes to the parent's own
 * wiki/synthesis/project-overview.md. Coalesces rapid-fire triggers the same
 * way triggerSynthesisUpdate does — at most one in-flight and one pending.
 *
 * Returns the jobId of the newly scheduled synthesis, or null if the caller
 * was coalesced into an already-in-flight run.
 */
export async function triggerParentSynthesisUpdate(
  projectCwd: string,
  projectId: number
): Promise<number | null> {
  lastParentProjectCwd = projectCwd;
  lastParentProjectId = projectId;

  if (parentSynthesisInFlight) {
    parentSynthesisPending = true;
    return null;
  }
  return scheduleParentSynthesisJob(projectCwd, projectId);
}
