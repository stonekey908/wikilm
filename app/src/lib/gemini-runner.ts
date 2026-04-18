/**
 * Gemini CLI runner — third provider path alongside Claude (subprocess)
 * and Ollama (HTTP). Jobs are routed here by the "gemini:<model>" prefix
 * in Settings.
 *
 * CLI reference (verified against gemini-cli 0.38.2):
 *   gemini -p "<prompt>" -m <model> -y -o text
 *     -p  non-interactive prompt (required for jobs)
 *     -m  model id (e.g. gemini-3-pro, gemini-3-flash)
 *     -y  yolo — auto-approve tool calls; without it the CLI would
 *         prompt the user and we have no stdin
 *     -o text  plain stdout (stream-json / json are also options)
 *
 * Detection strategy: Gemini doesn't have an equivalent to Ollama's
 * /api/tags — so we probe `gemini --version` to confirm presence and
 * expose a fixed short-list of current models. If the user picks a
 * model that the CLI's endpoint doesn't recognise, the resulting job
 * error surfaces through the normal /jobs error path (STO-1747).
 */

import { spawn, execFile, type ChildProcess } from "child_process";
import { promisify } from "util";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

const execFileP = promisify(execFile);

export interface GeminiModel {
  id: string; // e.g. "gemini:gemini-3-pro"
  name: string; // display name e.g. "gemini-3-pro"
  label: string; // short UI label
}

// Short list of current Gemini preview models — names verified against the
// live Gemini API. Invalid ids come back as 404 "Requested entity was not
// found"; we surface those through the normal stdout/error path.
const GEMINI_MODELS: GeminiModel[] = [
  { id: "gemini:gemini-3.1-pro-preview", name: "gemini-3.1-pro-preview", label: "Pro" },
  { id: "gemini:gemini-3-flash-preview", name: "gemini-3-flash-preview", label: "Flash" },
];

let cachedDetection: { available: boolean; version: string | null } | null = null;

/**
 * Check whether `gemini` is installed and callable. Result is cached for
 * the lifetime of the server process — Settings refreshes on full reload.
 */
export async function detectGemini(): Promise<{
  available: boolean;
  version: string | null;
  models: GeminiModel[];
}> {
  if (cachedDetection) {
    return {
      available: cachedDetection.available,
      version: cachedDetection.version,
      models: cachedDetection.available ? GEMINI_MODELS : [],
    };
  }

  try {
    const { stdout } = await execFileP("gemini", ["--version"], { timeout: 1000 });
    const version = stdout.trim() || null;
    cachedDetection = { available: true, version };
    return { available: true, version, models: GEMINI_MODELS };
  } catch {
    cachedDetection = { available: false, version: null };
    return { available: false, version: null, models: [] };
  }
}

// Lightweight sync preflight used by claude-runner's preflightProvider.
// Returns true if `gemini` is on PATH. Piggybacks on the cached detection
// when available so we don't pay for execFile on every job start.
export async function isGeminiAvailable(): Promise<boolean> {
  if (cachedDetection) return cachedDetection.available;
  const res = await detectGemini();
  return res.available;
}

// Track in-flight Gemini subprocesses for cancellation.
const geminiProcesses = new Map<number, ChildProcess>();

export interface GeminiJobOptions {
  prompt: string;
  model: string; // bare model id, e.g. "gemini-3-pro" (without "gemini:" prefix)
  projectCwd: string;
  onComplete?: (status: "completed" | "failed", jobId?: number) => void;
}

/**
 * Spawn a gemini subprocess for an existing job row. Mirrors the shape of
 * runOllamaJob so claude-runner's dispatcher can plug it in.
 */
export function runGeminiJob(
  jobId: number,
  options: GeminiJobOptions,
  done: () => void
): void {
  db.update(jobs)
    .set({ status: "running", startedAt: new Date().toISOString() })
    .where(eq(jobs.id, jobId))
    .run();

  const proc = spawn(
    "gemini",
    ["-p", options.prompt, "-m", options.model, "-y", "-o", "text"],
    {
      cwd: options.projectCwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    }
  );

  geminiProcesses.set(jobId, proc);
  db.update(jobs).set({ pid: proc.pid ?? null }).where(eq(jobs.id, jobId)).run();

  let output = "";
  let error = "";

  proc.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
    db.update(jobs).set({ output }).where(eq(jobs.id, jobId)).run();
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    error += chunk.toString();
    db.update(jobs).set({ error }).where(eq(jobs.id, jobId)).run();
  });

  proc.on("close", (code) => {
    geminiProcesses.delete(jobId);
    const current = db.select({ status: jobs.status }).from(jobs).where(eq(jobs.id, jobId)).get();
    if (current?.status === "cancelled" || current?.status === "completed") {
      done();
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
    options.onComplete?.(finalStatus, jobId);
    done();
  });

  proc.on("error", (err) => {
    geminiProcesses.delete(jobId);
    db.update(jobs)
      .set({
        status: "failed",
        error: err.message,
        completedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId))
      .run();
    options.onComplete?.("failed", jobId);
    done();
  });
}

/**
 * Cancel a running gemini subprocess — mirrors cancelOllamaJob so the
 * existing job-cancel endpoint can dispatch to it.
 */
export function cancelGeminiJob(jobId: number): boolean {
  const proc = geminiProcesses.get(jobId);
  if (!proc?.pid) return false;
  try {
    process.kill(proc.pid, "SIGTERM");
  } catch {
    // already dead
  }
  setTimeout(() => {
    if (proc.pid) {
      try {
        process.kill(proc.pid, 0);
        // still alive — force kill
        process.kill(proc.pid, "SIGKILL");
      } catch {
        // already dead
      }
    }
  }, 3000);
  return true;
}

export function hasGeminiJob(jobId: number): boolean {
  return geminiProcesses.has(jobId);
}

export { GEMINI_MODELS };
