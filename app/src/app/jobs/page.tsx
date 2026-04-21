"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";
import { formatJobError } from "@/lib/error-codes";

interface Job {
  id: number;
  projectId: number;
  type: string;
  title: string;
  status: string;
  pid: number | null;
  output: string | null;
  error: string | null;
  errorCode: string | null;
  progress: string | null;
  model: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

type StatusFilter = "all" | "active" | "completed" | "failed";

function parseProgress(raw: string | null): { current: number; total: number } | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (typeof p?.current === "number" && typeof p?.total === "number" && p.total > 0) {
      return { current: p.current, total: p.total };
    }
  } catch {}
  return null;
}

function statusBucket(s: string): "run" | "queue" | "done" | "fail" | "cancel" {
  if (s === "running") return "run";
  if (s === "queued") return "queue";
  if (s === "completed") return "done";
  if (s === "failed") return "fail";
  if (s === "cancelled") return "cancel";
  return "done";
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "";
  const ms = Math.max(0, e - s);
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return `${min}m ${rem.toString().padStart(2, "0")}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${(min % 60).toString().padStart(2, "0")}m`;
}

export default function DispatchPage() {
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const projectId = activeProject?.id ?? null;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [, force] = useState(0);

  const fetchJobs = useCallback(async () => {
    if (projectId === null) return;
    try {
      const res = await fetch(`/api/claude/job?projectId=${projectId}`);
      if (res.ok) {
        const d = await res.json();
        setJobs(d.jobs ?? []);
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    fetchJobs();
    const interval = window.setInterval(fetchJobs, 3000);
    return () => window.clearInterval(interval);
  }, [fetchJobs]);

  // Tick the "Xs" runtime label on active rows without refetching
  useEffect(() => {
    const i = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(i);
  }, []);

  const counts = useMemo(() => {
    const c = { all: jobs.length, active: 0, completed: 0, failed: 0 };
    for (const j of jobs) {
      if (j.status === "running" || j.status === "queued") c.active++;
      else if (j.status === "completed") c.completed++;
      else if (j.status === "failed" || j.status === "cancelled") c.failed++;
    }
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    if (filter === "active") return jobs.filter((j) => j.status === "running" || j.status === "queued");
    if (filter === "completed") return jobs.filter((j) => j.status === "completed");
    if (filter === "failed") return jobs.filter((j) => j.status === "failed" || j.status === "cancelled");
    return jobs;
  }, [jobs, filter]);

  async function cancelJob(j: Job) {
    try {
      const res = await fetch(`/api/claude/job/${j.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Job cancelled", description: j.title });
      fetchJobs();
    } catch {
      addToast({ type: "error", title: "Couldn't cancel" });
    }
  }

  async function dismissJob(j: Job) {
    try {
      const res = await fetch(`/api/claude/job/${j.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      if (!res.ok) throw new Error();
      setJobs((prev) => prev.filter((x) => x.id !== j.id));
    } catch {
      addToast({ type: "error", title: "Couldn't dismiss" });
    }
  }

  return (
    <div className="pad">
      <EditorialBreadcrumbs tail="Dispatch" />

      <div className="sec-head">
        <h1>
          The <em>Dispatch.</em>
        </h1>
        <div className="rail-meta">
          <div>
            <b>{counts.active}</b> active
          </div>
          <div>
            <b>{counts.completed}</b> completed
          </div>
          <div>
            <b>{counts.failed}</b> failed
          </div>
        </div>
      </div>

      <div className="dispatch-toolbar">
        <div className="dispatch-filter">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
            All · {counts.all}
          </button>
          <button className={filter === "active" ? "on" : ""} onClick={() => setFilter("active")}>
            Active · {counts.active}
          </button>
          <button className={filter === "completed" ? "on" : ""} onClick={() => setFilter("completed")}>
            Done · {counts.completed}
          </button>
          <button className={filter === "failed" ? "on" : ""} onClick={() => setFilter("failed")}>
            Failed · {counts.failed}
          </button>
        </div>
        <div className="count">
          Showing <b>{filtered.length}</b> of <b>{jobs.length}</b>
        </div>
      </div>

      <div className="dispatch">
        <div className="dispatch-head">
          <div>§ ID</div>
          <div>Task</div>
          <div>Type</div>
          <div>Model</div>
          <div>Status</div>
          <div>Progress</div>
          <div></div>
        </div>

        {filtered.length === 0 ? (
          <div className="dispatch-empty">No jobs match this filter.</div>
        ) : (
          filtered.map((j) => {
            const bucket = statusBucket(j.status);
            const rowClass = `dispatch-row${bucket === "run" ? " run" : ""}`;
            const progress = parseProgress(j.progress);
            const pct = progress
              ? Math.min(1, progress.current / progress.total)
              : bucket === "run"
                ? 0.45
                : bucket === "done"
                  ? 1
                  : 0;
            const progressLabel = progress
              ? `${progress.current}/${progress.total}`
              : bucket === "run"
                ? formatDuration(j.startedAt, null)
                : bucket === "done"
                  ? formatDuration(j.startedAt, j.completedAt)
                  : bucket === "fail"
                    ? "—"
                    : "—";
            const isActive = j.status === "running" || j.status === "queued";
            return (
              <div key={j.id} className={rowClass}>
                <div className="n">{String(j.id).padStart(3, "0")}</div>
                <div className="task">
                  {j.title}
                  {j.error && (() => {
                    const fmt = formatJobError(j.errorCode, j.error);
                    return (
                      <small style={{ color: "var(--red)" }}>
                        <b>{fmt.title}.</b> {fmt.description}
                      </small>
                    );
                  })()}
                </div>
                <div>
                  <span className="type-pill">{j.type}</span>
                </div>
                <div className="model">{j.model ? j.model.toUpperCase() : "—"}</div>
                <div>
                  <span className={`status ${bucket}`}>
                    <span className="d" />
                    {j.status}
                  </span>
                </div>
                <div className="progress-line">
                  <span className="bar">
                    <span style={{ transform: `scaleX(${pct})` }} />
                  </span>
                  <span>{progressLabel}</span>
                </div>
                <div className="act-cell">
                  {isActive ? (
                    <button
                      className="dispatch-cancel"
                      onClick={() => cancelJob(j)}
                      title="Cancel"
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="4" y1="4" x2="12" y2="12" />
                        <line x1="12" y1="4" x2="4" y2="12" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      className="dispatch-dismiss"
                      onClick={() => dismissJob(j)}
                      title="Dismiss"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
