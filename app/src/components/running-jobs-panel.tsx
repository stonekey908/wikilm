"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Loader2,
  Download,
  MessageSquare,
  Search,
  Beaker,
  Clock,
  Sparkles,
  Layers,
  Ban,
  PenLine,
} from "lucide-react";

interface Job {
  id: number;
  projectId: number;
  type: string;
  title: string;
  status: string;
  progress: string | null;
  model: string | null;
  startedAt: string | null;
  createdAt: string;
}

/**
 * Keep in sync with `/jobs` page. Duplicated rather than extracted because
 * the two files use different-size icons and the import graph stays shallow.
 */
const TYPE_ICONS: Record<string, typeof Download> = {
  ingest: Download,
  query: MessageSquare,
  lint: Beaker,
  fix: Beaker,
  research: Search,
  synthesis: Layers,
  output: Sparkles,
  "note-summary": PenLine,
};
const TYPE_COLORS: Record<string, { color: string; dim: string }> = {
  ingest: { color: "var(--blue)", dim: "var(--blue-dim)" },
  query: { color: "var(--primary)", dim: "var(--primary-dim)" },
  lint: { color: "var(--orange)", dim: "var(--orange-dim)" },
  fix: { color: "var(--green)", dim: "var(--green-dim)" },
  research: { color: "var(--green)", dim: "var(--green-dim)" },
  synthesis: { color: "var(--chart-4)", dim: "rgba(139,92,246,0.08)" },
  output: { color: "var(--chart-5)", dim: "rgba(236,72,153,0.08)" },
  "note-summary": { color: "var(--orange)", dim: "var(--orange-dim)" },
};

interface RunningJobsPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Floating panel anchored to the bottom-left of the viewport. Lists every
 * running + queued job across all projects with progress, model, and a
 * per-row cancel button. Polls every 2s while open; stops polling when
 * closed so we don't burn cache misses for nothing.
 */
export function RunningJobsPanel({ open, onClose }: RunningJobsPanelProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/job");
      if (!res.ok) return;
      const data = await res.json();
      const active = (data.jobs ?? []).filter(
        (j: Job) => j.status === "running" || j.status === "queued"
      );
      setJobs(active);
    } catch {
      // silent — panel stays on last-known state
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll + fetch on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchJobs();
    const timer = setInterval(fetchJobs, 2000);
    return () => clearInterval(timer);
  }, [open, fetchJobs]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Outside click closes
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Defer one frame so the same click that opened us doesn't also close us
    const t = setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  const cancelJob = useCallback(async (id: number) => {
    await fetch(`/api/claude/job/${id}`, { method: "DELETE" });
    fetchJobs();
  }, [fetchJobs]);

  const runningCount = useMemo(
    () => jobs.filter((j) => j.status === "running").length,
    [jobs]
  );
  const queuedCount = useMemo(
    () => jobs.filter((j) => j.status === "queued").length,
    [jobs]
  );

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-3 left-3 z-50 w-[360px] max-h-[70vh] bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-150"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="w-6 h-6 rounded-md bg-[var(--primary-dim)] flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-[var(--primary)] animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-[650] text-[var(--text-1)]">
            Active jobs
          </div>
          <div className="text-[11px] text-[var(--text-4)]">
            {runningCount} running
            {queuedCount > 0 && ` · ${queuedCount} queued`}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-[var(--text-4)]">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-[var(--text-4)]">
            No active jobs.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {jobs.map((job) => {
              const Icon = TYPE_ICONS[job.type] ?? Clock;
              const colors =
                TYPE_COLORS[job.type] ?? {
                  color: "var(--text-3)",
                  dim: "var(--bg-3)",
                };
              const progress = (() => {
                if (!job.progress) return null;
                try {
                  return JSON.parse(job.progress) as {
                    current: number;
                    total: number;
                  };
                } catch {
                  return null;
                }
              })();
              return (
                <div key={job.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: colors.dim }}
                    >
                      <Icon
                        className="w-3 h-3"
                        style={{ color: colors.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-[550] text-[var(--text-1)] leading-snug truncate">
                        {job.title}
                      </div>
                      <div className="text-[10.5px] text-[var(--text-4)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span
                          className="uppercase tracking-wider font-semibold"
                          style={{ color: colors.color }}
                        >
                          {job.type}
                        </span>
                        <span>·</span>
                        <span
                          className={`font-[550] ${
                            job.status === "running"
                              ? "text-[var(--green)]"
                              : "text-[var(--text-3)]"
                          }`}
                        >
                          {job.status}
                        </span>
                        {job.model && (
                          <>
                            <span>·</span>
                            <span
                              className="font-mono px-1.5 py-px rounded bg-[var(--bg-2)] text-[var(--text-3)]"
                              title="Model used for this job"
                            >
                              {job.model}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="p-1 rounded hover:bg-[var(--red-dim)] text-[var(--text-4)] hover:text-[var(--red)] transition-colors shrink-0"
                      title="Cancel"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {progress && (
                    <div className="mt-2 ml-8">
                      <div className="h-1 rounded-full bg-[var(--bg-3)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                          style={{
                            width: `${Math.round(
                              (progress.current / Math.max(progress.total, 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-[var(--text-4)] text-right mt-0.5 font-mono">
                        {progress.current} / {progress.total}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
