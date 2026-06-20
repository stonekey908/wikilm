"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { cx, useProjectId } from "../lib";
import type { JobRow } from "../types";

type Filter = "all" | "active" | "completed" | "failed";

function bucket(status: string): "run" | "queue" | "done" | "fail" | "cancel" {
  if (status === "running") return "run";
  if (status === "queued") return "queue";
  if (status === "completed" || status === "done") return "done";
  if (status === "failed" || status === "error") return "fail";
  return "cancel";
}
function dur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60); return `${h}h ${m % 60}m`;
}
function progressOf(j: JobRow): { pct: number; label: string } {
  let cur: number | null = null, tot: number | null = null;
  if (j.progress) { try { const p = JSON.parse(j.progress); if (p && typeof p.total === "number") { cur = p.current; tot = p.total; } } catch {} }
  const b = bucket(j.status);
  if (cur !== null && tot) return { pct: tot ? cur / tot : 0, label: `${cur}/${tot}` };
  if (b === "run") return { pct: 0.5, label: j.startedAt ? dur(Date.now() - new Date(j.startedAt).getTime()) : "running" };
  if (b === "done") return { pct: 1, label: j.startedAt && j.completedAt ? dur(new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime()) : "done" };
  return { pct: 0, label: "—" };
}

export function JobsView() {
  const projectId = useProjectId();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => {
    if (projectId === null) return;
    fetch(`/api/claude/job?projectId=${projectId}`).then((r) => r.json())
      .then((d: { jobs?: JobRow[] }) => setJobs(d.jobs ?? [])).catch(() => {});
  }, [projectId]);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  const counts = useMemo(() => {
    const c = { all: jobs.length, active: 0, completed: 0, failed: 0 };
    for (const j of jobs) {
      const b = bucket(j.status);
      if (b === "run" || b === "queue") c.active++;
      else if (b === "done") c.completed++;
      else if (b === "fail" || b === "cancel") c.failed++;
    }
    return c;
  }, [jobs]);

  const filtered = useMemo(() => jobs.filter((j) => {
    const b = bucket(j.status);
    if (filter === "active") return b === "run" || b === "queue";
    if (filter === "completed") return b === "done";
    if (filter === "failed") return b === "fail" || b === "cancel";
    return true;
  }), [jobs, filter]);

  const cancel = async (id: number) => { try { await fetch(`/api/claude/job/${id}`, { method: "DELETE" }); } catch {} addToast({ type: "info", title: "Job cancelled" }); load(); };
  const dismiss = async (id: number) => { try { await fetch(`/api/claude/job/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss" }) }); } catch {} load(); };

  return (
    <section className="view active">
      <div className="page">
        <div className="page-head"><h1 className="page-title">Jobs</h1><p className="page-sub">Background ingestion, research, synthesis, and lint runs</p></div>

        <div className="dispatch-toolbar">
          <div className="dispatch-filter">
            {(["all", "active", "completed", "failed"] as Filter[]).map((f) => (
              <button key={f} className={cx(filter === f && "on")} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "active" ? "Active" : f === "completed" ? "Done" : "Failed"} · {counts[f]}
              </button>
            ))}
          </div>
          <div className="dispatch-count">Showing <b>{filtered.length}</b> of <b>{jobs.length}</b></div>
        </div>

        <div className="dispatch-table">
          <div className="dispatch-head">
            <div>§ ID</div><div>Task</div><div>Type</div><div>Model</div><div>Status</div><div>Progress</div><div />
          </div>
          {filtered.length === 0 && <div className="dispatch-empty">No jobs match this filter.</div>}
          {filtered.map((j) => {
            const b = bucket(j.status);
            const active = b === "run" || b === "queue";
            const { pct, label } = progressOf(j);
            return (
              <div key={j.id} className={cx("dispatch-row", b === "run" && "run")}>
                <div className="n">{String(j.id).padStart(3, "0")}</div>
                <div className="task">{j.title}{j.error && <small> · {j.error}</small>}</div>
                <div><span className="type-pill">{j.type}</span></div>
                <div className="model">{j.model ? j.model.toUpperCase() : "—"}</div>
                <div><span className={`status ${b}`}><span className="d" />{j.status}</span></div>
                <div className="progress-line"><span className="bar"><span style={{ transform: `scaleX(${pct})` }} className={b === "run" ? "anim" : ""} /></span><span className="pl">{label}</span></div>
                <div className="act-cell">
                  {active
                    ? <button className="dispatch-x" title="Cancel" onClick={() => cancel(j.id)}><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.9}><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg></button>
                    : <button className="dispatch-x dim" title="Dismiss" onClick={() => dismiss(j.id)}>×</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
