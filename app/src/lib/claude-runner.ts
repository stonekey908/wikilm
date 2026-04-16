import { spawn, type ChildProcess } from "child_process";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMockStream, getMockResponse } from "@/lib/__mocks__/claude-mock";

export const isMockMode = process.env.MOCK_MODE === "true";

const MAX_CONCURRENT_JOBS = 3;

// Track running processes by job ID
const runningProcesses = new Map<number, ChildProcess>();

interface StreamOptions {
  prompt: string;
  projectCwd: string;
}

interface JobOptions {
  prompt: string;
  projectCwd: string;
  projectId: number;
  type: "ingest" | "query" | "lint" | "research";
  title: string;
}

/**
 * Get the count of currently running jobs
 */
export function getRunningJobCount(): number {
  return runningProcesses.size;
}

/**
 * Stream mode — returns a ReadableStream of SSE data.
 * Used for real-time chat responses.
 */
export function streamClaude({ prompt, projectCwd }: StreamOptions): ReadableStream {
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

  return new ReadableStream({
    start(controller) {
      const proc = spawn("claude", ["-p", prompt], {
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
        // Flush remaining buffer
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
 * Background job mode — spawns process, tracks in SQLite.
 * Used for ingest, lint, research operations.
 */
export async function startJob(options: JobOptions): Promise<number> {
  if (runningProcesses.size >= MAX_CONCURRENT_JOBS) {
    throw new Error(
      `Maximum concurrent jobs (${MAX_CONCURRENT_JOBS}) reached. Wait for a job to complete.`
    );
  }

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
    })();

    return jobId;
  }

  // Create job record
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

  const proc = spawn("claude", ["-p", options.prompt], {
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
    // Try to parse progress from output
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
  });

  return jobId;
}

/**
 * Cancel a running job by killing its process.
 */
export function cancelJob(jobId: number): boolean {
  const proc = runningProcesses.get(jobId);
  if (!proc) return false;

  proc.kill("SIGTERM");
  runningProcesses.delete(jobId);

  db.update(jobs)
    .set({
      status: "cancelled",
      completedAt: new Date().toISOString(),
    })
    .where(eq(jobs.id, jobId))
    .run();

  return true;
}

/**
 * Try to extract progress info from Claude's output.
 * Looks for patterns like "Processing 3/12 pages" or similar.
 */
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
