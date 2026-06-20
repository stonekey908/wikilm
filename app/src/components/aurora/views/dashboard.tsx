"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { useProject } from "@/components/project-switcher";
import { useProjectId } from "../lib";
import type { AuroraView } from "../aurora-shell";
import type { DashboardNudge, DashboardResponse, JobRow, LintFinding, NudgesResponse, WikiPageMeta } from "../types";

function greeting(): string {
  const h = new Date().getHours();
  return "Good " + (h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
}
function ago(iso?: string): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  const m = s / 60; if (m < 60) return `${Math.round(m)}m ago`;
  const h = m / 60; if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
const DJ_TONE: Record<string, string> = { running: "run", queued: "queue", completed: "done", done: "done", failed: "err", error: "err", cancelled: "queue" };

export function DashboardView({ onNavigate }: { onNavigate: (v: AuroraView) => void }) {
  const projectId = useProjectId();
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [nudges, setNudges] = useState<NudgesResponse | null>(null);
  const [pages, setPages] = useState<WikiPageMeta[]>([]);
  const [lint, setLint] = useState<LintFinding[]>([]);
  const [topic, setTopic] = useState("");

  const loadNudgesLint = useCallback(() => {
    if (projectId === null) return;
    fetch(`/api/dashboard/nudges?projectId=${projectId}`).then((r) => r.json()).then(setNudges).catch(() => {});
    fetch(`/api/lint/findings?projectId=${projectId}`).then((r) => r.json())
      .then((d: { findings?: LintFinding[] }) => setLint(d.findings ?? [])).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    fetch(`/api/dashboard?projectId=${projectId}`).then((r) => r.json())
      .then((d: DashboardResponse) => { if (!cancelled) setData(d); }).catch(() => {});
    fetch(`/api/wiki?projectId=${projectId}`).then((r) => r.json())
      .then((d: { pages?: WikiPageMeta[] }) => { if (!cancelled) setPages(d.pages ?? []); }).catch(() => {});
    loadNudgesLint();
    return () => { cancelled = true; };
  }, [projectId, loadNudgesLint]);

  const dismiss = async (id: number) => {
    try { await fetch(`/api/lint/findings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "dismissed" }) }); } catch {}
    addToast({ type: "info", title: "Dismissed" });
    loadNudgesLint();
  };
  const fix = async (id: number) => {
    try { await fetch(`/api/lint/findings/${id}/fix`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) }); } catch {}
    addToast({ type: "success", title: "Fix queued", description: "A repair job was dispatched." });
    loadNudgesLint();
  };
  const research = (t: string) => { setTopic(t); onNavigate("discover"); };

  const stats = data?.stats;
  const activeJobs: JobRow[] = (data?.activeJobs ?? []).slice(0, 6);
  const recent = pages.filter((p) => !["index", "log"].includes(p.slug)).slice(0, 8);
  const nudgeCount = (nudges?.suggestedQuestion.length ?? 0) + (nudges?.missingCrossRef.length ?? 0) + (nudges?.missingConcept.length ?? 0);
  const openLint = lint.filter((f) => f.status === "open" || f.status === "fixing");

  const stat = (v: number | undefined, l: string) => (
    <div className="stat"><div className="sv">{v ?? "—"}</div><div className="sl">{l}</div></div>
  );
  const markGroup = (items: DashboardNudge[] | undefined, cls: string, label: string) =>
    (items ?? []).map((n) => (
      <div key={n.id} className={`mark ${cls}`}>
        <div className="mark-cat">{label}</div>
        <div className="mark-title">{n.title}</div>
        {n.description && <div className="mark-desc">{n.description}</div>}
        <div className="mark-actions">
          <button className="mk-btn primary" onClick={() => research(n.title)}>Research</button>
          <button className="mk-btn" onClick={() => dismiss(n.id)}>Dismiss</button>
        </div>
      </div>
    ));

  return (
    <section className="view active">
      <div className="page">
        <div className="dash-greet">{greeting()}{activeProject ? `, ${activeProject.name}` : ""}</div>
        <div className="dash-dateline">
          <span className="dd">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
          <span className="sepdot" /><span className="dd"><b>{stats?.wikiPages ?? "—"}</b> pages</span>
          <span className="sepdot" /><span className="dd"><b>{activeJobs.length}</b> in flight</span>
          <span className="sepdot" /><span className="dd"><b>{nudgeCount}</b> nudges</span>
          <span className="sepdot" /><span className="dd"><b>{openLint.length}</b> lint</span>
        </div>

        <div className="dash-mini">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--text-3)" strokeWidth={1.7}><circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" /></svg>
          <input placeholder="Ask anything…" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onNavigate("discover"); }} />
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

        <div className="dash-ledger">
          {/* Recent pages */}
          <div className="lcol">
            <div className="lcol-head"><span className="sct">§</span><span className="t">Recent pages</span><span className="ct">{recent.length}</span></div>
            {recent.length === 0 && <div className="none">No pages yet.</div>}
            {recent.map((p, i) => (
              <div key={p.slug} className="entry" onClick={() => onNavigate("wiki")}>
                <span className="rn">{ROMAN[i]}</span>
                <div style={{ minWidth: 0 }}><div className="et">{p.title}</div><div className="em">{p.type}</div></div>
                <span className="eAgo">{ago(p.updatedAt)}</span>
              </div>
            ))}
          </div>

          {/* Marginalia — nudges */}
          <div className="lcol">
            <div className="lcol-head"><span className="sct">§</span><span className="t">Marginalia</span><span className="ct">{nudgeCount}</span></div>
            {nudgeCount === 0 && <div className="none">No nudges — the wiki looks tidy.</div>}
            {markGroup(nudges?.suggestedQuestion, "amber", "Suggested question")}
            {markGroup(nudges?.missingCrossRef, "violet", "Missing cross-ref")}
            {markGroup(nudges?.missingConcept, "red", "Missing concept")}
          </div>

          {/* Dispatch — jobs + commission */}
          <div className="lcol">
            <div className="lcol-head"><span className="sct">§</span><span className="t">The Dispatch</span><span className="ct">{activeJobs.length}</span></div>
            {activeJobs.length === 0 && <div className="none">No jobs in flight.</div>}
            {activeJobs.map((j) => {
              const prog = (() => { try { const p = JSON.parse(j.progress || "null"); return p && p.total ? Math.round((p.current / p.total) * 100) : null; } catch { return null; } })();
              return (
                <div key={j.id} className="dispatch-job" onClick={() => onNavigate("jobs")}>
                  <span className={`dj-dot ${DJ_TONE[j.status] || "queue"}`} />
                  <div className="dj-main">
                    <div className="dj-title">{j.title}</div>
                    <div className="dj-meta">{j.type}{j.model ? ` · ${j.model}` : ""}</div>
                    {prog !== null && <div className="dj-prog"><div className="fill" style={{ width: `${prog}%` }} /></div>}
                  </div>
                </div>
              );
            })}
            <div className="commission">
              <div className="commission-box">
                <input placeholder="A topic, an open question…" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") research(topic); }} />
                <button className="send" onClick={() => research(topic)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 8h10M9 4l4 4-4 4" /></svg>
                </button>
              </div>
              <div className="commission-hint">Queues a research pass; grounded drafts appear in Sources.</div>
            </div>
          </div>
        </div>

        {/* Lint panel — the full findings list */}
        <div className="dash-panel" style={{ marginTop: 18 }}>
          <div className="dash-panel-h">
            <span className="t">Lint</span>
            <span className="ct" style={{ marginLeft: 8, fontSize: 11, color: "var(--text-3)", background: "var(--bg-2)", padding: "1px 7px", borderRadius: 999 }}>{openLint.length} open</span>
            <button className="mini-link" style={{ marginLeft: "auto" }} onClick={() => onNavigate("jobs")}>Run lint</button>
          </div>
          {openLint.length === 0 && <div className="none">No open lint findings.</div>}
          {openLint.map((f) => {
            const fixable = ["orphan", "missing_concept", "missing_cross_ref", "stale_claim", "contradiction"].includes(f.category);
            return (
              <div key={f.id} className="lint-row">
                <span className={`sev ${f.severity === "warn" ? "warn" : "info"}`} />
                <div style={{ minWidth: 0 }}>
                  <div className="lt">{f.title}</div>
                  <div className="lc">{f.category.replace(/_/g, " ")}{f.targetPage ? ` · ${f.targetPage.replace(/^wiki\//, "")}` : ""}</div>
                </div>
                <div className="lx">
                  {fixable && (
                    <button className="icon-btn" title="Auto-fix" onClick={() => fix(f.id)}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M9 2l1.5 3L14 6l-2.5 2 .6 3.5L9 10l-3 1.5.6-3.5L4 6l3.5-1z" /></svg>
                    </button>
                  )}
                  <button className="icon-btn" title="Dismiss" onClick={() => dismiss(f.id)}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
