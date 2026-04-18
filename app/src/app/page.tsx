"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useProject } from "@/components/project-switcher";
import { NudgesSection } from "@/components/nudges-section";
import {
  BookOpen,
  FileText,
  Users,
  Lightbulb,
  Download,
  MessageSquare,
  Search,
  Beaker,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface DashboardData {
  stats: {
    sources: number;
    wikiPages: number;
    entities: number;
    concepts: number;
  };
  recentActivity: {
    date: string;
    operation: string;
    title: string;
    details: string;
  }[];
  activeJobs: {
    id: number;
    type: string;
    title: string;
    status: string;
    progress: string | null;
    startedAt: string | null;
  }[];
  recentJobs: {
    id: number;
    type: string;
    title: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
  }[];
}

const statConfig = [
  { key: "sources" as const, label: "Sources", icon: Download, color: "var(--blue)", dimColor: "var(--blue-dim)" },
  { key: "wikiPages" as const, label: "Wiki Pages", icon: FileText, color: "var(--primary)", dimColor: "var(--primary-dim)" },
  { key: "entities" as const, label: "Entities", icon: Users, color: "var(--orange)", dimColor: "var(--orange-dim)" },
  { key: "concepts" as const, label: "Concepts", icon: Lightbulb, color: "var(--green)", dimColor: "var(--green-dim)" },
];

const quickActions = [
  { label: "Ingest source", icon: Download, href: "/sources", color: "var(--blue)" },
  { label: "Ask a question", icon: MessageSquare, href: "/chat", color: "var(--primary)" },
  { label: "Run lint", icon: Beaker, href: "/lint", color: "var(--orange)" },
  { label: "Research topic", icon: Search, href: "/chat", color: "var(--green)" },
];

const operationIcons: Record<string, string> = {
  ingest: "📥",
  query: "❓",
  lint: "🔍",
  update: "✏️",
};

function statusIcon(status: string) {
  switch (status) {
    case "running":
    case "queued":
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--blue)]" />;
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5 text-[var(--red)]" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-[var(--text-4)]" />;
  }
}

export default function DashboardPage() {
  const { activeProject } = useProject();
  const activeProjectId = activeProject?.id ?? 1;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard?projectId=${activeProjectId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail, keep stale data
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const stats = data?.stats ?? { sources: 0, wikiPages: 0, entities: 0, concepts: 0 };

  return (
    <div className="p-8 max-w-[960px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Project overview and quick actions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statConfig.map((stat) => (
          <div
            key={stat.key}
            className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider">
                {stat.label}
              </div>
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ backgroundColor: stat.dimColor }}
              >
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-[650] text-[var(--text-1)] font-mono">
              {loading ? "—" : stats[stat.key]}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-[600] text-[var(--text-2)] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-150 text-[13px] font-[500] text-[var(--text-2)]"
            >
              <action.icon className="w-4 h-4 shrink-0" style={{ color: action.color }} />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Nudges — parent-scoped lint findings with actions. Hidden when empty. */}
      <NudgesSection />

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-[600] text-[var(--text-2)]">Recent Activity</h2>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)] divide-y divide-[var(--border)]">
            {!loading && data?.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.map((entry, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-base mt-0.5">{operationIcons[entry.operation] ?? "📝"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-[500] text-[var(--text-1)] truncate">
                      {entry.title}
                    </div>
                    <div className="text-[12px] text-[var(--text-4)] mt-0.5">
                      {entry.date} &middot; {entry.operation}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-[13px] text-[var(--text-4)]">
                {loading ? "Loading..." : "No recent activity"}
              </div>
            )}
          </div>
        </div>

        {/* Active Jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-[600] text-[var(--text-2)]">Active Jobs</h2>
            <Link
              href="/jobs"
              className="text-[12px] font-[500] text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)] divide-y divide-[var(--border)]">
            {!loading && data?.activeJobs && data.activeJobs.length > 0 ? (
              data.activeJobs.map((job) => {
                const progress = job.progress ? JSON.parse(job.progress) : null;
                return (
                  <div key={job.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(job.status)}
                      <span className="text-[13px] font-[500] text-[var(--text-1)] truncate">
                        {job.title}
                      </span>
                    </div>
                    {progress && (
                      <div className="mt-1.5">
                        <div className="h-1.5 rounded-full bg-[var(--bg-3)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                            style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-[var(--text-4)] mt-1">
                          {progress.current}/{progress.total}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : !loading && data?.recentJobs && data.recentJobs.length > 0 ? (
              data.recentJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="px-4 py-3 flex items-center gap-2">
                  {statusIcon(job.status)}
                  <span className="text-[13px] font-[500] text-[var(--text-1)] truncate flex-1">
                    {job.title}
                  </span>
                  <span className="text-[11px] text-[var(--text-4)] capitalize">{job.status}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-[13px] text-[var(--text-4)]">
                {loading ? "Loading..." : "No active jobs"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
