"use client";

import { useEffect, useState, useCallback } from "react";
import { formatJobError } from "@/lib/error-codes";
import { useProject } from "@/components/project-switcher";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Download,
  MessageSquare,
  Search,
  Beaker,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
  Ban,
} from "lucide-react";

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
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const typeIcons: Record<string, typeof Download> = {
  ingest: Download,
  query: MessageSquare,
  lint: Beaker,
  fix: Beaker,
  research: Search,
};

const typeColors: Record<string, { color: string; dim: string }> = {
  ingest: { color: "var(--blue)", dim: "var(--blue-dim)" },
  query: { color: "var(--primary)", dim: "var(--primary-dim)" },
  lint: { color: "var(--orange)", dim: "var(--orange-dim)" },
  fix: { color: "var(--green)", dim: "var(--green-dim)" },
  research: { color: "var(--green)", dim: "var(--green-dim)" },
};

const statusFilters = ["all", "running", "queued", "completed", "failed", "cancelled"] as const;
type StatusFilter = (typeof statusFilters)[number];

function statusBadge(status: string) {
  const config: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
    running: { icon: Loader2, color: "var(--blue)", bg: "var(--blue-dim)", label: "Running" },
    queued: { icon: Clock, color: "var(--text-3)", bg: "var(--bg-3)", label: "Queued" },
    completed: { icon: CheckCircle2, color: "var(--green)", bg: "var(--green-dim)", label: "Completed" },
    failed: { icon: XCircle, color: "var(--red)", bg: "var(--red-dim)", label: "Failed" },
    cancelled: { icon: Ban, color: "var(--text-4)", bg: "var(--bg-3)", label: "Cancelled" },
  };
  const c = config[status] ?? config.queued;
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-[550]"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      <Icon className={`w-3 h-3 ${status === "running" ? "animate-spin" : ""}`} />
      {c.label}
    </span>
  );
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSec}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JobsPage() {
  const { activeProject } = useProject();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const qp = activeProject ? `?projectId=${activeProject.id}` : "";
      const res = await fetch(`/api/claude/job${qp}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const cancelJob = async (id: number) => {
    try {
      await fetch(`/api/claude/job/${id}`, { method: "DELETE" });
      fetchJobs();
    } catch {
      // ignore
    }
  };

  const dismissJob = async (id: number) => {
    try {
      await fetch(`/api/claude/job/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      fetchJobs();
    } catch {
      // ignore
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (typeFilter !== "all" && job.type !== typeFilter) return false;
    return true;
  });

  const jobTypes = Array.from(new Set(jobs.map((j) => j.type)));

  return (
    <div className="p-8 max-w-[960px]">
      <Breadcrumbs project={activeProject} />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
          Jobs
        </h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Background processes and task history
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-[var(--bg-2)] rounded-lg p-0.5">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[12px] font-[500] capitalize transition-colors ${
                statusFilter === f
                  ? "bg-[var(--surface-card)] text-[var(--text-1)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-3)] hover:text-[var(--text-2)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {jobTypes.length > 1 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-[12px] font-[500] text-[var(--text-2)] bg-[var(--bg-2)] border border-[var(--border)] rounded-md px-2 py-1 outline-none"
          >
            <option value="all">All types</option>
            {jobTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={fetchJobs}
          className="ml-auto text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Jobs List */}
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)] divide-y divide-[var(--border)]">
        {loading ? (
          <div className="px-4 py-12 text-center text-[13px] text-[var(--text-4)]">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--text-4)]" />
            Loading jobs...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="px-4 py-12 text-center text-[13px] text-[var(--text-4)]">
            No jobs found
          </div>
        ) : (
          filteredJobs.map((job) => {
            const TypeIcon = typeIcons[job.type] ?? Clock;
            const colors = typeColors[job.type] ?? { color: "var(--text-3)", dim: "var(--bg-3)" };
            const isExpanded = expandedJob === job.id;
            const progress = job.progress ? JSON.parse(job.progress) : null;

            return (
              <div key={job.id}>
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                >
                  {/* Expand indicator */}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-4)] shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-4)] shrink-0" />
                  )}

                  {/* Type icon */}
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: colors.dim }}
                  >
                    <TypeIcon className="w-3.5 h-3.5" style={{ color: colors.color }} />
                  </div>

                  {/* Title & meta */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-[500] text-[var(--text-1)] truncate">
                      {job.title}
                    </div>
                    <div className="text-[11px] text-[var(--text-4)] mt-0.5">
                      {formatTime(job.startedAt)} &middot; {formatDuration(job.startedAt, job.completedAt)}
                    </div>
                  </div>

                  {/* Progress bar for running jobs */}
                  {job.status === "running" && progress && (
                    <div className="w-24 shrink-0">
                      <div className="h-1.5 rounded-full bg-[var(--bg-3)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                          style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-[var(--text-4)] text-right mt-0.5">
                        {progress.current}/{progress.total}
                      </div>
                    </div>
                  )}

                  {/* Status badge */}
                  {statusBadge(job.status)}

                  {/* Cancel button */}
                  {(job.status === "running" || job.status === "queued") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelJob(job.id);
                      }}
                      className="p-1 rounded hover:bg-[var(--red-dim)] text-[var(--text-4)] hover:text-[var(--red)] transition-colors shrink-0"
                      title="Cancel job"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Dismiss button */}
                  {(job.status === "completed" || job.status === "failed" || job.status === "cancelled") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissJob(job.id);
                      }}
                      className="p-1 rounded hover:bg-[var(--bg-3)] text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors shrink-0"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 ml-10">
                    {/* Error section — classified title on top, raw text below */}
                    {job.status === "failed" && (job.error || job.errorCode) && (() => {
                      const msg = formatJobError(job.errorCode, job.error);
                      return (
                        <div
                          className="mb-3 rounded-md p-3"
                          style={{ backgroundColor: "var(--red-dim)", color: "var(--red)" }}
                        >
                          <div className="text-[12px] font-[600] mb-1">{msg.title}</div>
                          <div className="text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-all">
                            {msg.description}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Output log */}
                    {job.output ? (
                      <div className="rounded-md bg-[var(--bg-2)] border border-[var(--border)] p-3 max-h-64 overflow-y-auto">
                        <pre className="text-[12px] font-mono text-[var(--text-2)] leading-relaxed whitespace-pre-wrap break-all">
                          {job.output}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-[12px] text-[var(--text-4)]">
                        {job.status === "running" ? "Waiting for output..." : "No output recorded"}
                      </div>
                    )}

                    {/* Retry for failed */}
                    {job.status === "failed" && (
                      <button className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-[500] bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-strong)] transition-colors">
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
