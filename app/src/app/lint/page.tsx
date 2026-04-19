"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Beaker,
  Play,
  Loader2,
  CheckCircle2,
  ExternalLink,
  X,
  Wand2,
  Link2Off,
  Lightbulb,
  AlertTriangle,
  Clock,
  HelpCircle,
  Search,
  Unlink,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { useProject } from "@/components/project-switcher";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatJobError } from "@/lib/error-codes";

interface Finding {
  id: number;
  projectId: number;
  jobId: number | null;
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

interface FindingsResponse {
  findings: Finding[];
  latestJob: LatestJob | null;
}

const categoryMeta: Record<
  string,
  { label: string; description: string; icon: typeof Beaker; color: string; dim: string }
> = {
  orphan: {
    label: "Orphans",
    description: "Pages with no inbound links",
    icon: Unlink,
    color: "var(--orange)",
    dim: "var(--orange-dim)",
  },
  missing_concept: {
    label: "Missing concept pages",
    description: "Frequently mentioned ideas that don't have their own page",
    icon: Lightbulb,
    color: "var(--green)",
    dim: "var(--green-dim)",
  },
  contradiction: {
    label: "Contradictions",
    description: "Pages making competing claims",
    icon: AlertTriangle,
    color: "var(--red)",
    dim: "var(--red-dim)",
  },
  stale_claim: {
    label: "Stale claims",
    description: "Statements possibly superseded by newer sources",
    icon: Clock,
    color: "var(--text-3)",
    dim: "var(--bg-3)",
  },
  missing_cross_ref: {
    label: "Missing cross-references",
    description: "Pages that should link to each other but don't",
    icon: Link2Off,
    color: "var(--blue)",
    dim: "var(--blue-dim)",
  },
  suggested_question: {
    label: "Suggested questions",
    description: "Gaps worth investigating",
    icon: HelpCircle,
    color: "var(--primary)",
    dim: "var(--primary-dim)",
  },
};

const CATEGORY_ORDER = [
  "orphan",
  "contradiction",
  "stale_claim",
  "missing_concept",
  "missing_cross_ref",
  "suggested_question",
];

const FIXABLE_CATEGORIES = new Set([
  "orphan",
  "missing_concept",
  "missing_cross_ref",
  "stale_claim",
]);

// Findings in these categories open the /sources research flow instead of
// an edit-wiki fix — the right answer for a gap is "find new material", not
// "rewrite existing pages".
const RESEARCHABLE_CATEGORIES = new Set(["suggested_question"]);

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function wikiPageToHref(targetPage: string | null): string | null {
  if (!targetPage) return null;
  const stripped = targetPage.replace(/^wiki\//, "").replace(/\.md$/, "");
  if (!stripped) return null;
  return `/wiki?slug=${encodeURIComponent(stripped)}`;
}

export default function LintPage() {
  const router = useRouter();
  const { activeProject } = useProject();
  const activeProjectId = activeProject?.id ?? null;
  const [data, setData] = useState<FindingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [dismissing, setDismissing] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [fixingBulk, setFixingBulk] = useState(false);
  const { addToast } = useToast();

  const fetchFindings = useCallback(async () => {
    // Defer until the active project is known so the first paint reflects
    // the real project, not project 1 via endpoint default.
    if (activeProjectId === null) return;
    try {
      const res = await fetch(
        `/api/lint/findings?status=active&projectId=${activeProjectId}`
      );
      if (res.ok) {
        const json: FindingsResponse = await res.json();
        setData(json);
        // Prune selections for findings that no longer exist or are no longer open
        const validIds = new Set(
          json.findings.filter((f) => f.status === "open").map((f) => f.id)
        );
        setSelected((prev) => {
          const next = new Set<number>();
          for (const id of prev) if (validIds.has(id)) next.add(id);
          return next.size === prev.size ? prev : next;
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  // Re-fetch when project changes; clear selections so a fix-all from
  // another project can't fire against stale ids.
  useEffect(() => {
    setSelected(new Set());
    fetchFindings();
    const interval = setInterval(fetchFindings, 4000);
    return () => clearInterval(interval);
  }, [fetchFindings]);

  const latestJob = data?.latestJob ?? null;
  const jobRunning =
    latestJob?.status === "running" || latestJob?.status === "queued";
  const lintRunning = jobRunning && latestJob?.type === "lint";

  async function runLint() {
    if (starting || jobRunning || activeProjectId === null) return;
    setStarting(true);
    try {
      const res = await fetch("/api/lint/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to start lint job");
      }
      const data = await res.json();
      // If the job failed pre-flight (provider unreachable etc.), surface
      // the classified error instead of pretending the run started.
      if (data.status === "failed") {
        const msg = formatJobError(data.errorCode, data.error);
        addToast({ type: "error", ...msg });
      } else {
        addToast({
          type: "info",
          title: "Lint started",
          description: "Auditing the wiki — findings will appear as they're discovered.",
        });
      }
      fetchFindings();
    } catch (err) {
      addToast({
        type: "error",
        title: "Couldn't start lint",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setStarting(false);
    }
  }

  async function dismiss(id: number) {
    setDismissing((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/lint/findings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error("Dismiss failed");
      setData((prev) =>
        prev
          ? { ...prev, findings: prev.findings.filter((f) => f.id !== id) }
          : prev
      );
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      addToast({ type: "error", title: "Couldn't dismiss finding" });
    } finally {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function fixOne(id: number) {
    if (activeProjectId === null) return;
    try {
      const res = await fetch(`/api/lint/findings/${id}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to start fix");
      }
      const data = await res.json();
      if (data.status === "failed") {
        const msg = formatJobError(data.errorCode, data.error);
        addToast({ type: "error", ...msg });
        fetchFindings();
        return;
      }
      addToast({
        type: "info",
        title: "Fix started",
        description: "Claude is applying the fix — this takes ~30s.",
      });
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchFindings();
    } catch (err) {
      addToast({
        type: "error",
        title: "Couldn't start fix",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async function fixMany(ids: number[]) {
    if (ids.length === 0 || activeProjectId === null) return;
    setFixingBulk(true);
    try {
      const res = await fetch("/api/lint/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId, findingIds: ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to start fix");
      }
      const json = (await res.json()) as {
        count: number;
        status?: string;
        error?: string | null;
        errorCode?: string | null;
      };
      if (json.status === "failed") {
        const msg = formatJobError(json.errorCode, json.error);
        addToast({ type: "error", ...msg });
        setSelected(new Set());
        fetchFindings();
        return;
      }
      addToast({
        type: "info",
        title: `Fixing ${json.count} findings`,
        description: "Claude is batching these — this can take a few minutes.",
      });
      setSelected(new Set());
      fetchFindings();
    } catch (err) {
      addToast({
        type: "error",
        title: "Couldn't start bulk fix",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setFixingBulk(false);
    }
  }

  function toggleCategory(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const findings = data?.findings ?? [];
  const grouped = useMemo(() => {
    const m = new Map<string, Finding[]>();
    for (const f of findings) {
      const list = m.get(f.category) ?? [];
      list.push(f);
      m.set(f.category, list);
    }
    return m;
  }, [findings]);

  const hasFindings = findings.length > 0;
  const selectedFixableIds = useMemo(
    () =>
      findings
        .filter(
          (f) =>
            selected.has(f.id) &&
            f.status === "open" &&
            FIXABLE_CATEGORIES.has(f.category)
        )
        .map((f) => f.id),
    [findings, selected]
  );

  const lastRanLabel = latestJob?.completedAt
    ? `Last ${latestJob.type === "fix" ? "fix" : "lint"} ${formatRelative(latestJob.completedAt)}`
    : latestJob?.startedAt && !jobRunning
      ? `Started ${formatRelative(latestJob.startedAt)}`
      : latestJob
        ? null
        : "Never run";

  return (
    <div className="p-8 max-w-[960px]">
      <Breadcrumbs project={activeProject} />
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: "var(--orange-dim)" }}
            >
              <Beaker className="w-4 h-4" style={{ color: "var(--orange)" }} />
            </div>
            <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
              Lint
            </h1>
          </div>
          <p className="text-sm text-[var(--text-3)]">
            Wiki health check — orphans, missing pages, contradictions, and cross-reference gaps.
          </p>
        </div>

        <button
          onClick={runLint}
          disabled={starting || jobRunning}
          className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[var(--primary)] text-white text-[13px] font-[550] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {lintRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Run lint
            </>
          )}
        </button>
      </div>

      {/* Status strip */}
      <div className="mb-5 flex items-center gap-2 text-[12px] text-[var(--text-4)]">
        {lintRunning ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-[var(--blue)]" />
            <span className="text-[var(--text-3)]">
              Auditing the wiki — this usually takes a minute or two.
            </span>
          </>
        ) : jobRunning && latestJob?.type === "fix" ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-[var(--green)]" />
            <span className="text-[var(--text-3)]">
              Applying fixes — findings will disappear as they're resolved.
            </span>
          </>
        ) : (
          <>
            <span>{lastRanLabel}</span>
            {hasFindings && (
              <>
                <span className="text-[var(--text-4)]">·</span>
                <span>
                  {findings.length} open finding{findings.length === 1 ? "" : "s"}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Selection bar */}
      {selectedFixableIds.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-md bg-[var(--primary-dim)] border border-[var(--primary)] text-[13px]">
          <div className="text-[var(--primary)] font-[550]">
            {selectedFixableIds.length} finding
            {selectedFixableIds.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-2.5 py-1 rounded text-[12px] font-[500] text-[var(--text-3)] hover:bg-[var(--bg-hover)]"
            >
              Clear
            </button>
            <button
              onClick={() => fixMany(selectedFixableIds)}
              disabled={fixingBulk || jobRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--primary)] text-white text-[12px] font-[550] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-3 h-3" />
              Fix selected
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="text-center py-16 text-[13px] text-[var(--text-4)]">Loading…</div>
      ) : !hasFindings ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)] p-10 text-center">
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-md flex items-center justify-center"
            style={{ backgroundColor: "var(--green-dim)" }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: "var(--green)" }} />
          </div>
          <div className="text-[14px] font-[550] text-[var(--text-1)] mb-1">
            {latestJob ? "No open findings" : "Haven't run yet"}
          </div>
          <div className="text-[13px] text-[var(--text-3)] max-w-md mx-auto">
            {latestJob
              ? "The wiki is clean — or everything's been dismissed. Run lint again to re-audit."
              : "Run lint to audit the wiki for orphans, missing concepts, contradictions, and gaps."}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
            const items = grouped.get(cat)!;
            const meta = categoryMeta[cat];
            const isCollapsed = collapsed.has(cat);
            const Icon = meta?.icon ?? Beaker;
            const isFixable = FIXABLE_CATEGORIES.has(cat);
            const fixableOpenIds = items
              .filter((f) => f.status === "open")
              .map((f) => f.id);

            return (
              <div
                key={cat}
                className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)] overflow-hidden"
              >
                <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: meta?.dim ?? "var(--bg-3)" }}
                    >
                      <Icon
                        className="w-3.5 h-3.5"
                        style={{ color: meta?.color ?? "var(--text-3)" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-[600] text-[var(--text-1)]">
                        {meta?.label ?? cat}
                        <span className="ml-2 text-[11px] font-mono font-[500] text-[var(--text-4)]">
                          {items.length}
                        </span>
                      </div>
                      {meta?.description && (
                        <div className="text-[12px] text-[var(--text-4)] mt-0.5">
                          {meta.description}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-4)] font-mono">
                      {isCollapsed ? "+" : "−"}
                    </span>
                  </button>
                  {isFixable && fixableOpenIds.length > 0 && (
                    <button
                      onClick={() => fixMany(fixableOpenIds)}
                      disabled={fixingBulk || jobRunning}
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[12px] font-[500] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Wand2 className="w-3 h-3" />
                      Fix all ({fixableOpenIds.length})
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="divide-y divide-[var(--border)]">
                    {items.map((f) => {
                      const targetHref = wikiPageToHref(f.targetPage);
                      const pendingDismiss = dismissing.has(f.id);
                      const isFixing = f.status === "fixing";
                      const rowFixable = FIXABLE_CATEGORIES.has(f.category);
                      const rowResearchable = RESEARCHABLE_CATEGORIES.has(f.category);
                      return (
                        <div
                          key={f.id}
                          className={`px-4 py-3 flex items-start gap-3 ${isFixing ? "opacity-60" : ""}`}
                        >
                          {rowFixable && !isFixing ? (
                            <input
                              type="checkbox"
                              checked={selected.has(f.id)}
                              onChange={() => toggleSelected(f.id)}
                              className="mt-1.5 shrink-0 accent-[var(--primary)] cursor-pointer"
                              aria-label="Select finding"
                            />
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                              style={{
                                backgroundColor:
                                  f.severity === "warn"
                                    ? "var(--red)"
                                    : meta?.color ?? "var(--text-3)",
                              }}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-[550] text-[var(--text-1)] flex items-center gap-2">
                              {f.title}
                              {isFixing && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-[550] px-1.5 py-px rounded-full bg-[var(--green-dim)] text-[var(--green)]">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  Fixing
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-[var(--text-3)] mt-0.5 leading-relaxed">
                              {f.description}
                            </div>
                            {f.suggestedAction && (
                              <div className="text-[11px] text-[var(--text-4)] mt-1 italic">
                                Suggested: {f.suggestedAction}
                              </div>
                            )}
                            {f.targetPage && (
                              <div className="mt-1.5">
                                {targetHref ? (
                                  <Link
                                    href={targetHref}
                                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--primary)] hover:underline"
                                  >
                                    {f.targetPage}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                ) : (
                                  <span className="text-[11px] font-mono text-[var(--text-4)]">
                                    {f.targetPage}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {rowFixable && !isFixing && (
                              <button
                                onClick={() => fixOne(f.id)}
                                disabled={jobRunning}
                                title="Fix with Claude"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-[500] text-[var(--text-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Wand2 className="w-3 h-3" />
                                Fix
                              </button>
                            )}
                            {rowResearchable && !isFixing && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/sources?tab=research&topic=${encodeURIComponent(f.title)}`
                                  )
                                }
                                title="Research new sources to close this gap"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-[500] text-[var(--text-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]"
                              >
                                <Search className="w-3 h-3" />
                                Research
                              </button>
                            )}
                            {!isFixing && (
                              <button
                                onClick={() => dismiss(f.id)}
                                disabled={pendingDismiss}
                                title="Dismiss"
                                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-4)] hover:text-[var(--text-2)] disabled:opacity-40"
                              >
                                {pendingDismiss ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
