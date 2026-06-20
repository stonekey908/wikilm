"use client";

import { useEffect, useState } from "react";
import { useProjectId } from "../lib";
import type { AuroraView } from "../aurora-shell";
import type { DashboardResponse, JobRow, WikiPageMeta } from "../types";

function greeting(): string {
  const h = new Date().getHours();
  return "Good " + (h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
}

const STATUS_TONE: Record<string, string> = {
  running: "accent", done: "green", error: "red", queued: "muted", cancelled: "muted",
};

export function DashboardView({ onNavigate }: { onNavigate: (v: AuroraView) => void }) {
  const projectId = useProjectId();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [pages, setPages] = useState<WikiPageMeta[]>([]);

  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    fetch(`/api/dashboard?projectId=${projectId}`).then((r) => r.json())
      .then((d: DashboardResponse) => { if (!cancelled) setData(d); }).catch(() => {});
    fetch(`/api/wiki?projectId=${projectId}`).then((r) => r.json())
      .then((d: { pages?: WikiPageMeta[] }) => { if (!cancelled) setPages(d.pages ?? []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  const stats = data?.stats;
  const jobs: JobRow[] = [...(data?.activeJobs ?? []), ...(data?.recentJobs ?? [])].slice(0, 5);

  const stat = (v: number | undefined, l: string) => (
    <div className="stat"><div className="sv">{v ?? "—"}</div><div className="sl">{l}</div></div>
  );

  return (
    <section className="view active">
      <div className="page">
        <div className="dash-greet">{greeting()}</div>
        <div className="dash-sub">Here&apos;s what&apos;s happening in your knowledge base.</div>

        <div className="dash-mini">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--text-3)" strokeWidth={1.7}><circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" /></svg>
          <input placeholder="Ask anything…" onKeyDown={(e) => { if (e.key === "Enter") onNavigate("discover"); }} />
          <button className="send" onClick={() => onNavigate("discover")}>
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="13" x2="8" y2="3" /><path d="M4 7l4-4 4 4" /></svg>
          </button>
        </div>

        <div className="stat-grid">
          {stat(stats?.wikiPages, "Wiki pages")}
          {stat(stats?.sources, "Sources")}
          {stat(stats?.concepts, "Concepts")}
          {stat(stats?.entities, "Entities")}
        </div>

        <div className="dash-cols">
          <div className="dash-panel">
            <div className="dash-panel-h"><span className="t">Recent pages</span><button className="mini-link" style={{ marginLeft: "auto" }} onClick={() => onNavigate("wiki")}>Open wiki</button></div>
            {pages.length === 0 && <div className="ds" style={{ padding: "8px" }}>No pages yet.</div>}
            {pages.slice(0, 5).map((p) => (
              <div key={p.slug} className="dash-row" onClick={() => onNavigate("wiki")}>
                <span className="di"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M3 2h7l3 3v9H3z" /></svg></span>
                <div><div className="dt">{p.title}</div><div className="ds">{p.type}</div></div>
              </div>
            ))}
          </div>

          <div className="dash-panel">
            <div className="dash-panel-h"><span className="t">Activity</span><button className="mini-link" style={{ marginLeft: "auto" }} onClick={() => onNavigate("jobs")}>All jobs</button></div>
            {jobs.length === 0 && <div className="ds" style={{ padding: "8px" }}>No recent activity.</div>}
            {jobs.map((j) => {
              const tone = STATUS_TONE[j.status] || "accent";
              return (
                <div key={j.id} className="dash-row" onClick={() => onNavigate("jobs")}>
                  <span className="di" style={{ background: `var(--${tone === "muted" ? "bg" : tone}-wash, var(--bg-2))`, color: `var(--${tone === "muted" ? "text-3" : tone})` }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="8" cy="8" r="6.2" /><polyline points="8,4.5 8,8 10.5,9.8" /></svg>
                  </span>
                  <div><div className="dt">{j.title}</div><div className="ds" style={{ textTransform: "capitalize" }}>{j.status}</div></div>
                  {j.model && <span className="dmeta">{j.model}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
