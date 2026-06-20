"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { useProjectId } from "../lib";
import type { JobRow } from "../types";

const LABEL: Record<string, string> = {
  running: "Running", done: "Completed", queued: "Queued", error: "Failed", cancelled: "Cancelled",
};
const TONE: Record<string, string> = { running: "run", done: "done", queued: "queue", error: "err", cancelled: "queue" };

function pct(progress: string | null): number | null {
  if (!progress) return null;
  const m = progress.match(/(\d+)\s*\/\s*(\d+)/);
  if (m) { const a = +m[1], b = +m[2]; return b ? Math.round((a / b) * 100) : null; }
  const p = progress.match(/(\d+)\s*%/);
  return p ? +p[1] : null;
}

export function JobsView() {
  const projectId = useProjectId();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<JobRow[]>([]);

  const load = useCallback(() => {
    if (projectId === null) return;
    fetch(`/api/claude/job?projectId=${projectId}`).then((r) => r.json())
      .then((d: { jobs?: JobRow[] }) => setJobs(d.jobs ?? [])).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // live refresh for running jobs
    return () => clearInterval(t);
  }, [load]);

  const cancel = async (id: number) => {
    try { await fetch(`/api/claude/job/${id}`, { method: "DELETE" }); } catch {}
    addToast({ type: "info", title: "Job cancelled" });
    load();
  };

  return (
    <section className="view active">
      <div className="page">
        <div className="page-head"><h1 className="page-title">Jobs</h1><p className="page-sub">Background ingestion, research, and synthesis runs</p></div>
        {jobs.length === 0 && (
          <div className="empty"><div className="ei"><svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="8" cy="8" r="6.2" /><polyline points="8,4.5 8,8 10.5,9.8" /></svg></div><div className="et">No jobs yet</div><div className="es">Research or ingest a source to see activity here.</div></div>
        )}
        {jobs.map((j) => {
          const tone = TONE[j.status] || "queue";
          const p = pct(j.progress);
          return (
            <div key={j.id} className="job">
              <div className={`job-ico ${tone}`}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="8" cy="8" r="6.2" /><polyline points="8,4.5 8,8 10.5,9.8" /></svg>
              </div>
              <div className="job-main">
                <div className="job-title">{j.title}</div>
                <div className="job-sub">{j.progress || j.type}</div>
                {j.status === "running" && p !== null && <div className="job-prog"><div className="fill" style={{ width: `${p}%` }} /></div>}
                {j.status === "done" && <div className="job-prog"><div className="fill" style={{ width: "100%", background: "var(--green)" }} /></div>}
              </div>
              <div className="job-right">
                {j.model && <span className="job-model">{j.model}</span>}
                <span className={`job-status ${tone}`}>{LABEL[j.status] || j.status}</span>
                {(j.status === "running" || j.status === "queued") && (
                  <button className="job-x" title="Cancel" onClick={() => cancel(j.id)}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
