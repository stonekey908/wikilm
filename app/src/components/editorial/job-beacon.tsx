"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/project-switcher";

interface Job {
  id: number;
  type: string;
  title: string;
  status: string;
  model: string | null;
  startedAt: string | null;
  createdAt: string;
}

function fmtDur(start: string | null): string {
  if (!start) return "";
  const s = new Date(start).getTime();
  if (!Number.isFinite(s)) return "";
  const ms = Date.now() - s;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m`;
}

export function JobBeacon() {
  const router = useRouter();
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? null;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  const fetchJobs = useCallback(async () => {
    if (projectId === null) return;
    try {
      const res = await fetch(`/api/claude/job?projectId=${projectId}`);
      if (res.ok) {
        const d = await res.json();
        const active = (d.jobs ?? []).filter(
          (j: Job) => j.status === "running" || j.status === "queued"
        );
        setJobs(active);
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    fetchJobs();
    const i = window.setInterval(fetchJobs, 3000);
    return () => window.clearInterval(i);
  }, [fetchJobs]);

  // Runtime ticker for the dropdown rows
  useEffect(() => {
    if (!open) return;
    const i = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(i);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const count = jobs.length;
  const hasActive = count > 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className={`icon-btn job-beacon${hasActive ? "" : " idle"}`}
        onClick={() => setOpen((v) => !v)}
        title={hasActive ? `${count} job${count === 1 ? "" : "s"} running` : "No jobs running"}
      >
        {hasActive ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4v4l2.5 2.5">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 8 8"
                to="360 8 8"
                dur="3s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4v4l2.5 2.5" />
          </svg>
        )}
        {hasActive && <span className="bead">{count}</span>}
      </button>

      {open && (
        <div className="job-drop">
          <div className="job-drop-head">
            <span>
              <b>{count}</b> running
            </span>
            <a
              href="/jobs"
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                router.push("/jobs");
              }}
            >
              Dispatch →
            </a>
          </div>
          <div className="job-drop-body">
            {jobs.length === 0 ? (
              <div className="job-drop-empty">No jobs in flight.</div>
            ) : (
              jobs.map((j) => (
                <div
                  key={j.id}
                  className={`job-drop-row${j.status === "queued" ? " queue" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    router.push("/jobs");
                  }}
                >
                  <span className="dot" />
                  <div className="body">
                    <div className="t">{j.title}</div>
                    <div className="f">
                      {j.type.toUpperCase()}
                      {j.model ? ` · ${j.model.toUpperCase()}` : ""}
                    </div>
                  </div>
                  <span className="time">{fmtDur(j.startedAt ?? j.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
