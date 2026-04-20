"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import { LedgerMarginalia } from "@/components/editorial/ledger/ledger-nudges";
import { LedgerDispatchResearch } from "@/components/editorial/ledger/ledger-dispatch-research";

interface DashboardStats {
  sources: number;
  wikiPages: number;
  entities: number;
  concepts: number;
}

interface LogEntry {
  date: string;
  operation: string;
  title: string;
  details: string;
}

interface Job {
  id: number;
  type: string;
  title: string;
  status: string;
  progress: string | null;
  model: string | null;
  createdAt: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentActivity: LogEntry[];
  activeJobs: Job[];
}

interface WikiPage {
  title: string;
  type: string;
  slug: string;
  updatedAt: string;
}

const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 2) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  if (d < 30) return `${Math.floor(d / 7)}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
}

function roman(i: number): string {
  const vals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
  return vals[i] ?? `${i + 1}`;
}

export default function LedgerPage() {
  const router = useRouter();
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? null;
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentPages, setRecentPages] = useState<WikiPage[]>([]);
  const [nudgeCount, setNudgeCount] = useState<number>(0);

  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    fetch(`/api/dashboard?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d: DashboardData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    fetch(`/api/dashboard/nudges?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d: { promotion: unknown[]; theme: unknown[]; gap: unknown[] }) => {
        if (cancelled) return;
        setNudgeCount((d.promotion?.length ?? 0) + (d.theme?.length ?? 0) + (d.gap?.length ?? 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    fetch(`/api/wiki?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d: { pages: WikiPage[] }) => {
        if (cancelled) return;
        const sorted = [...(d.pages ?? [])]
          .filter((p) => !["index", "log"].includes(p.slug))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 8);
        setRecentPages(sorted);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const now = useMemo(() => new Date(), []);
  const weekday = DAYS_LONG[now.getDay()];
  const dayMonth = `${now.getDate()} ${MONTHS_LONG[now.getMonth()]}`;
  const year = now.getFullYear();

  const projectName = activeProject?.name ?? "a new day";
  const stats = data?.stats ?? { sources: 0, wikiPages: 0, entities: 0, concepts: 0 };
  const jobsCount = data?.activeJobs.length ?? 0;

  return (
    <div className="pad">
      <div className="ledger-head">
        <h1>
          Good afternoon,
          <br />
          <em>{projectName}.</em>
        </h1>
        <div className="dateline">
          <div>{weekday}</div>
          <div>
            <b>{dayMonth}</b> · {year}
          </div>
          <div>
            <b>{stats.wikiPages}</b> pages total
          </div>
          <div>
            {jobsCount} {jobsCount === 1 ? "job" : "jobs"}
            {nudgeCount > 0 ? ` · ${nudgeCount} ${nudgeCount === 1 ? "nudge" : "nudges"}` : ""}
          </div>
        </div>
      </div>

      <div className="run" style={{ "--run-cells": 3 } as React.CSSProperties}>
        <div className="cell">
          <div className="idx">i</div>
          <div className="lab">Pages</div>
          <div className="val">{stats.wikiPages.toLocaleString()}</div>
        </div>
        <div className="cell">
          <div className="idx">ii</div>
          <div className="lab">Sources</div>
          <div className="val">{stats.sources.toLocaleString()}</div>
        </div>
        <div className="cell">
          <div className="idx">iii</div>
          <div className="lab">Concepts</div>
          <div className="val">{stats.concepts.toLocaleString()}</div>
        </div>
      </div>

      <div className="ledger-body">
        <div className="col">
          <div className="col-head">
            <span className="n">§</span>
            <h2>
              Recent <em>pages</em>
            </h2>
            <span className="c">{recentPages.length}</span>
          </div>
          {recentPages.length === 0 ? (
            <div
              style={{
                fontFamily: "var(--font-inst)",
                fontStyle: "italic",
                fontSize: "calc(13px * var(--fs-scale, 1))",
                color: "var(--ink-3)",
                padding: "8px 0",
              }}
            >
              No pages yet in this project.
            </div>
          ) : (
            recentPages.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                className="entry"
                onClick={() => router.push(`/wiki?slug=${encodeURIComponent(p.slug)}`)}
              >
                <span className="n">{roman(i)}</span>
                <span className="entry-body">
                  <span className="t">{p.title}</span>
                  <span className="sub">
                    {p.type} · {p.slug}
                  </span>
                </span>
                <span className="when">{formatRelative(p.updatedAt)}</span>
              </button>
            ))
          )}
        </div>

        <div className="col">
          <div className="col-head">
            <span className="n">§</span>
            <h2>
              <em>Marginalia</em>
            </h2>
          </div>
          <LedgerMarginalia />
        </div>

        <div className="col">
          <div className="col-head">
            <span className="n">§</span>
            <h2>
              The <em>Dispatch</em>
            </h2>
          </div>
          <LedgerDispatchResearch activeJobs={data?.activeJobs ?? []} />
        </div>
      </div>
    </div>
  );
}
