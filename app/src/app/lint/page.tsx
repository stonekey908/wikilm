"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";

/** Matches lib/lint.ts FIXABLE_CATEGORIES — the lint/fix pipeline only
 *  knows how to repair these. Suggested questions + nudge-family findings
 *  (promotion/theme/gap) are user-driven, not auto-fixable. */
const FIXABLE_CATEGORIES = new Set([
  "orphan",
  "missing_concept",
  "missing_cross_ref",
  "stale_claim",
  "contradiction",
]);

interface Finding {
  id: number;
  projectId: number;
  jobId: number | null;
  scope: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  targetPage: string | null;
  suggestedAction: string | null;
  status: string;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
}

interface LatestJob {
  id: number;
  type: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

type StatusFilter = "active" | "dismissed" | "resolved" | "all";

const CATEGORY_LABEL: Record<string, string> = {
  orphan: "Orphans",
  missing_concept: "Missing concepts",
  contradiction: "Contradictions",
  stale_claim: "Stale claims",
  missing_cross_ref: "Missing cross-refs",
  suggested_question: "Suggested questions",
  promotion_candidate: "Promotion candidates",
  recurring_theme: "Recurring themes",
  parent_gap: "Parent gaps",
};

const CATEGORY_ORDER = [
  "contradiction",
  "stale_claim",
  "orphan",
  "missing_concept",
  "missing_cross_ref",
  "suggested_question",
  "promotion_candidate",
  "recurring_theme",
  "parent_gap",
];

function severityClass(s: string, cat: string): string {
  if (s === "warn" || cat === "contradiction") return "warn";
  if (cat === "stale_claim") return "severe";
  return "info";
}

function fmtAgo(iso: string | undefined | null): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "never";
  const diff = Date.now() - t;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function EditInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const projectId = activeProject?.id ?? null;

  const [findings, setFindings] = useState<Finding[]>([]);
  const [latestJob, setLatestJob] = useState<LatestJob | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [gone, setGone] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const autoFiredRef = useState({ done: false })[0];
  const autoRun = searchParams.get("run") === "1";

  const fetchFindings = useCallback(async () => {
    if (projectId === null) return;
    try {
      const res = await fetch(
        `/api/lint/findings?projectId=${projectId}&status=${statusFilter}&scope=all`
      );
      if (!res.ok) return;
      const d = await res.json();
      setFindings(d.findings ?? []);
      setLatestJob(d.latestLintJob ?? null);
    } catch {}
  }, [projectId, statusFilter]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  // Palette intent: /lint?run=1 triggers a fresh pass on arrival
  useEffect(() => {
    if (autoFiredRef.done) return;
    if (!autoRun || !projectId) return;
    autoFiredRef.done = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("run");
    window.history.replaceState(null, "", url.pathname + url.search);
    runLint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, projectId]);

  // Poll while a lint job is running
  useEffect(() => {
    if (!latestJob || (latestJob.status !== "running" && latestJob.status !== "queued")) return;
    const i = window.setInterval(fetchFindings, 3000);
    return () => window.clearInterval(i);
  }, [latestJob, fetchFindings]);

  const mark = useCallback((id: number, on: boolean) => {
    setBusy((p) => {
      const next = new Set(p);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  async function runLint() {
    if (!projectId || running) return;
    setRunning(true);
    try {
      const res = await fetch("/api/lint/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Lint pass started — findings will land below" });
      fetchFindings();
    } catch {
      addToast({ type: "error", title: "Couldn't start lint" });
    } finally {
      setRunning(false);
    }
  }

  async function dismiss(f: Finding) {
    mark(f.id, true);
    try {
      const res = await fetch(`/api/lint/findings/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error();
      setGone((p) => new Set(p).add(f.id));
      addToast({ type: "success", title: "Dismissed" });
      window.setTimeout(() => {
        setFindings((p) => p.filter((x) => x.id !== f.id));
        setGone((p) => {
          const n = new Set(p);
          n.delete(f.id);
          return n;
        });
      }, 300);
    } catch {
      addToast({ type: "error", title: "Couldn't dismiss" });
    } finally {
      mark(f.id, false);
    }
  }

  async function fixOne(f: Finding) {
    mark(f.id, true);
    try {
      const res = await fetch(`/api/lint/findings/${f.id}/fix`, { method: "POST" });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Fix queued — see Dispatch" });
      fetchFindings();
    } catch {
      addToast({ type: "error", title: "Couldn't queue fix" });
    } finally {
      mark(f.id, false);
    }
  }

  async function fixCategory(cat: string, items: Finding[]) {
    if (!projectId) return;
    const ids = items
      .filter((f) => f.status === "open" && FIXABLE_CATEGORIES.has(f.category))
      .map((f) => f.id);
    if (ids.length === 0) {
      addToast({ type: "info", title: "Nothing auto-fixable in this category" });
      return;
    }
    ids.forEach((id) => mark(id, true));
    try {
      const res = await fetch("/api/lint/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingIds: ids, projectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "fix failed");
      }
      const d = await res.json();
      addToast({
        type: "success",
        title: `Fixing ${ids.length} in ${cat}`,
        description: "Synthesis will refresh automatically after all fixes complete.",
      });
      // Follow the bulk-fix job so the list refreshes when it finishes
      if (d.jobId) {
        const poll = window.setInterval(async () => {
          try {
            const jr = await fetch(`/api/claude/job/${d.jobId}`);
            if (jr.ok) {
              const j = await jr.json();
              if (j.status === "completed" || j.status === "failed" || j.status === "cancelled") {
                window.clearInterval(poll);
                ids.forEach((id) => mark(id, false));
                fetchFindings();
              }
            }
          } catch {}
        }, 3000);
      }
    } catch (err: unknown) {
      ids.forEach((id) => mark(id, false));
      addToast({ type: "error", title: err instanceof Error ? err.message : "Couldn't queue bulk fix" });
    }
  }

  function researchGap(f: Finding) {
    // Hand the suggested question / gap off to the real research stream
    // by navigating to /sources with the topic pre-filled. The Research
    // tab auto-fires on mount when ?topic= is present.
    const topic = f.title;
    router.push(`/sources?tab=research&topic=${encodeURIComponent(topic)}`);
  }

  function toggleGroup(cat: string) {
    setCollapsed((p) => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat);
      else n.add(cat);
      return n;
    });
  }

  const grouped = useMemo(() => {
    const groups = new Map<string, Finding[]>();
    for (const cat of CATEGORY_ORDER) groups.set(cat, []);
    for (const f of findings) {
      if (!groups.has(f.category)) groups.set(f.category, []);
      groups.get(f.category)!.push(f);
    }
    return Array.from(groups.entries()).filter(([, v]) => v.length > 0);
  }, [findings]);

  const counts = useMemo(() => {
    const c = { active: 0, warn: 0, dismissed: 0, total: findings.length };
    for (const f of findings) {
      if (f.status === "open" || f.status === "fixing") c.active++;
      if (f.severity === "warn") c.warn++;
      if (f.status === "dismissed") c.dismissed++;
    }
    return c;
  }, [findings]);

  const jobRunning =
    latestJob && (latestJob.status === "running" || latestJob.status === "queued");

  return (
    <div className="pad">
      <EditorialBreadcrumbs tail="Edit" />

      <div className="sec-head">
        <h1>
          The <em>Edit.</em>
        </h1>
        <div className="rail-meta">
          <div>
            <b>{counts.active}</b> open
          </div>
          <div>
            <b>{counts.warn}</b> warn
          </div>
          <div>
            Last pass <b>{fmtAgo(latestJob?.completedAt ?? latestJob?.startedAt)}</b>
          </div>
        </div>
      </div>

      <div className="edit-toolbar">
        <button className="btn primary" onClick={runLint} disabled={running || !!jobRunning}>
          {jobRunning ? "Linting…" : running ? "Queueing…" : "Run lint pass →"}
        </button>
        <div className="edit-filter">
          {(["active", "dismissed", "resolved", "all"] as StatusFilter[]).map((s) => (
            <button key={s} className={statusFilter === s ? "on" : ""} onClick={() => setStatusFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        <span className="count">
          Showing <b>{findings.length}</b> findings
        </span>
      </div>

      {findings.length === 0 ? (
        <div className="edit-empty">
          {jobRunning
            ? "Lint pass in flight — findings will land here as they come in."
            : statusFilter === "active"
              ? "Nothing to flag. Run a lint pass to surface new findings."
              : `No ${statusFilter} findings.`}
        </div>
      ) : (
        grouped.map(([cat, items]) => {
          const isCollapsed = collapsed.has(cat);
          const isFixable = FIXABLE_CATEGORIES.has(cat);
          const openInCat = items.filter((f) => f.status === "open").length;
          return (
            <div key={cat} className="edit-group">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  className={`edit-group-head${isCollapsed ? " collapsed" : ""}`}
                  style={{ flex: 1 }}
                  onClick={() => toggleGroup(cat)}
                >
                  <span className="chev-sm">▾</span>
                  <span className="lab">
                    <em>{CATEGORY_LABEL[cat] ?? cat}</em>
                  </span>
                  <span className="c">{items.length}</span>
                </button>
                {isFixable && openInCat > 1 && (
                  <button
                    type="button"
                    className="btn sm primary"
                    style={{ marginBottom: 10 }}
                    onClick={() => fixCategory(cat, items)}
                    title={`Queue a bulk fix for all open ${cat.replace(/_/g, " ")} findings — synthesis refreshes after`}
                  >
                    Fix all · {openInCat}
                  </button>
                )}
              </div>
              {!isCollapsed &&
                items.map((f) => {
                  const sevClass = severityClass(f.severity, f.category);
                  const isFixing = f.status === "fixing" || busy.has(f.id);
                  const isGone = gone.has(f.id);
                  return (
                    <div
                      key={f.id}
                      className={`finding ${sevClass}${isFixing ? " fixing" : ""}${isGone ? " gone" : ""}`}
                    >
                      <div className="body">
                        <div className="cat">{f.category.replace(/_/g, " ")}</div>
                        <div className="t">{f.title}</div>
                        <div className="d">{f.description}</div>
                        {f.targetPage && (
                          <button
                            type="button"
                            className="tgt"
                            onClick={() => {
                              const slug = f.targetPage!.includes(":")
                                ? f.targetPage!.split(":").slice(-1)[0]
                                : f.targetPage!;
                              router.push(`/wiki?slug=${encodeURIComponent(slug)}`);
                            }}
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                          >
                            Open target · {f.targetPage}
                          </button>
                        )}
                      </div>
                      <div className="acts">
                        {f.status === "open" && FIXABLE_CATEGORIES.has(f.category) && (
                          <button
                            className="btn primary"
                            onClick={() => fixOne(f)}
                            disabled={isFixing}
                            title={f.suggestedAction ?? "Apply suggested fix"}
                          >
                            {isFixing ? "Fixing…" : "Fix"}
                          </button>
                        )}
                        {f.status === "open" && (f.category === "suggested_question" || f.category === "parent_gap") && (
                          <button
                            className="btn primary"
                            onClick={() => researchGap(f)}
                            disabled={isFixing}
                            title="Open Research with this as the topic"
                          >
                            Research →
                          </button>
                        )}
                        {f.status !== "dismissed" && (
                          <button className="btn red" onClick={() => dismiss(f)} disabled={isFixing}>
                            Dismiss
                          </button>
                        )}
                        {f.status === "dismissed" && (
                          <span className="seal ghost" style={{ justifyContent: "center" }}>
                            Dismissed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={null}>
      <EditInner />
    </Suspense>
  );
}
