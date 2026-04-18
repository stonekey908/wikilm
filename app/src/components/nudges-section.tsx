"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpCircle,
  Lightbulb,
  HelpCircle,
  Search,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";

interface DashboardNudge {
  id: number;
  projectId: number;
  projectSlug: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  targetPage: string | null;
  suggestedAction: string | null;
  dedupeKey: string;
  createdAt: string;
}

interface NudgesResponse {
  promotion: DashboardNudge[];
  theme: DashboardNudge[];
  gap: DashboardNudge[];
}

type NudgeGroupKey = "promotion" | "theme" | "gap";

interface GroupMeta {
  label: string;
  chipColor: string;
  chipDim: string;
  icon: typeof Sparkles;
}

const GROUP_META: Record<NudgeGroupKey, GroupMeta> = {
  promotion: {
    label: "Promotion",
    chipColor: "var(--primary)",
    chipDim: "var(--primary-dim)",
    icon: ArrowUpCircle,
  },
  theme: {
    label: "Theme",
    chipColor: "var(--chart-4)",
    chipDim: "rgba(139,92,246,0.08)",
    icon: Sparkles,
  },
  gap: {
    label: "Gap",
    chipColor: "var(--orange)",
    chipDim: "var(--orange-dim)",
    icon: HelpCircle,
  },
};

/**
 * Dashboard-level nudges — reads parent-scoped lint findings from the wiki
 * and renders them as actionable cards grouped by type. Each nudge has
 * category-specific actions (Promote, Create concept page, Research, Dismiss).
 *
 * Renders null when there are no findings so it doesn't clutter a clean
 * dashboard. Polls are cheap (sqlite), but fetch is manual (on mount + after
 * each action) rather than on an interval — nudges don't appear without a
 * parent lint run, which is a deliberate user action.
 */
export function NudgesSection() {
  const router = useRouter();
  const { addToast } = useToast();
  const [data, setData] = useState<NudgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Track per-nudge busy + dismissed state so the UI can optimistically hide
  // cards while the server call is in flight.
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  // Modal state for "Create concept page" — lets the user name the concept
  // before we scaffold it, rather than auto-generating a filename.
  const [conceptModal, setConceptModal] = useState<{
    nudge: DashboardNudge;
    title: string;
  } | null>(null);
  const [conceptBusy, setConceptBusy] = useState(false);

  const fetchNudges = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/nudges");
      if (res.ok) {
        const json = (await res.json()) as NudgesResponse;
        setData(json);
      }
    } catch {
      // silently fail — dashboard should keep working even if nudges fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  const visibleCounts = useMemo(() => {
    if (!data) return { promotion: 0, theme: 0, gap: 0, total: 0 };
    const promotion = data.promotion.filter((n) => !hidden.has(n.id)).length;
    const theme = data.theme.filter((n) => !hidden.has(n.id)).length;
    const gap = data.gap.filter((n) => !hidden.has(n.id)).length;
    return { promotion, theme, gap, total: promotion + theme + gap };
  }, [data, hidden]);

  if (loading) return null;
  if (!data || visibleCounts.total === 0) return null;

  function markBusy(id: number, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function dismiss(nudge: DashboardNudge) {
    markBusy(nudge.id, true);
    try {
      const res = await fetch(`/api/lint/findings/${nudge.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error("Dismiss failed");
      setHidden((prev) => new Set(prev).add(nudge.id));
    } catch {
      addToast({ type: "error", title: "Couldn't dismiss nudge" });
    } finally {
      markBusy(nudge.id, false);
    }
  }

  async function promote(nudge: DashboardNudge) {
    if (!nudge.targetPage) {
      addToast({
        type: "error",
        title: "No target page",
        description: "This nudge has no page to promote.",
      });
      return;
    }
    // target_page format from the parent lint prompt: "<childSlug>:<pageSlug>"
    const colon = nudge.targetPage.lastIndexOf(":");
    if (colon === -1) {
      addToast({
        type: "error",
        title: "Invalid target",
        description: `Expected "<childSlug>:<pageSlug>", got ${nudge.targetPage}`,
      });
      return;
    }
    const childSlug = nudge.targetPage.slice(0, colon);
    const pageSlug = nudge.targetPage.slice(colon + 1);

    markBusy(nudge.id, true);
    try {
      const res = await fetch(
        `/api/projects/${nudge.projectId}/promote-page`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId: nudge.id,
            childSlug,
            pageSlug,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Promote failed (HTTP ${res.status})`);
      }
      const out = await res.json();
      addToast({
        type: "info",
        title: "Page promoted",
        description: `Moved to ${out.parentSlug ?? nudge.projectSlug}`,
      });
      setHidden((prev) => new Set(prev).add(nudge.id));
    } catch (e) {
      addToast({
        type: "error",
        title: "Couldn't promote page",
        description: (e as Error).message,
      });
    } finally {
      markBusy(nudge.id, false);
    }
  }

  async function submitConcept() {
    if (!conceptModal) return;
    const { nudge, title } = conceptModal;
    const trimmed = title.trim();
    if (!trimmed) {
      addToast({ type: "error", title: "Concept title is required" });
      return;
    }
    setConceptBusy(true);
    // Parent-level gaps and recurring themes are the two paths into this
    // modal; both may reference pages in the description. We don't attempt
    // to parse them — evidencingSlugs stays empty for now and the scaffold
    // writes a TL;DR placeholder.
    try {
      const res = await fetch("/api/wiki/concept-scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingId: nudge.id,
          projectId: nudge.projectId,
          title: trimmed,
          evidencingSlugs: [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Scaffold failed (HTTP ${res.status})`);
      }
      const out = await res.json();
      addToast({
        type: "info",
        title: "Concept page created",
        description: `wiki/concepts/${out.slug}.md`,
      });
      setHidden((prev) => new Set(prev).add(nudge.id));
      setConceptModal(null);
    } catch (e) {
      addToast({
        type: "error",
        title: "Couldn't create concept page",
        description: (e as Error).message,
      });
    } finally {
      setConceptBusy(false);
    }
  }

  function researchTopic(nudge: DashboardNudge) {
    router.push(
      `/sources?tab=research&topic=${encodeURIComponent(nudge.title)}`
    );
  }

  function renderCard(nudge: DashboardNudge, group: NudgeGroupKey) {
    const meta = GROUP_META[group];
    const Icon = meta.icon;
    const isBusy = busy.has(nudge.id);
    return (
      <div
        key={nudge.id}
        className="px-4 py-3 flex items-start gap-3"
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: meta.chipDim }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: meta.chipColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                color: meta.chipColor,
                backgroundColor: meta.chipDim,
              }}
            >
              {meta.label}
            </span>
            <span
              className="text-[11px] font-mono text-[var(--text-4)] truncate"
              title={nudge.projectSlug}
            >
              {nudge.projectSlug}
            </span>
          </div>
          <div className="text-[13px] font-[550] text-[var(--text-1)] mt-1">
            {nudge.title}
          </div>
          <div className="text-[12px] text-[var(--text-3)] mt-0.5 leading-relaxed">
            {nudge.description}
          </div>
          {nudge.suggestedAction && (
            <div className="text-[11px] text-[var(--text-4)] mt-1 italic">
              {nudge.suggestedAction}
            </div>
          )}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {group === "promotion" && (
              <button
                disabled={isBusy}
                onClick={() => promote(nudge)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-[500] rounded-md bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-3 h-3" />
                )}
                Promote
              </button>
            )}
            {(group === "theme" || group === "gap") && (
              <button
                disabled={isBusy}
                onClick={() =>
                  setConceptModal({ nudge, title: nudge.title })
                }
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-[500] rounded-md bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lightbulb className="w-3 h-3" />
                Create concept page
              </button>
            )}
            {(group === "theme" || group === "gap") && (
              <button
                disabled={isBusy}
                onClick={() => researchTopic(nudge)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-[500] rounded-md border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-3 h-3" />
                Research this
              </button>
            )}
            <button
              disabled={isBusy}
              onClick={() => dismiss(nudge)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-[500] rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-3 h-3" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderGroup(group: NudgeGroupKey, nudges: DashboardNudge[]) {
    const visible = nudges.filter((n) => !hidden.has(n.id));
    if (visible.length === 0) return null;
    const meta = GROUP_META[group];
    return (
      <div key={group}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-[600] text-[var(--text-2)]">
            {meta.label} ({visible.length})
          </h3>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)] divide-y divide-[var(--border)]">
          {visible.map((n) => renderCard(n, group))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-[600] text-[var(--text-2)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--primary)]" />
          Nudges
          <span className="text-[11px] font-[500] text-[var(--text-4)] font-mono">
            {visibleCounts.total}
          </span>
        </h2>
      </div>
      <div className="space-y-4">
        {renderGroup("promotion", data.promotion)}
        {renderGroup("theme", data.theme)}
        {renderGroup("gap", data.gap)}
      </div>

      {conceptModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center"
          onClick={() => !conceptBusy && setConceptModal(null)}
        >
          <div
            className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] w-[440px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--text-1)]">
                New concept page
              </div>
              <div className="text-[11px] text-[var(--text-3)] mt-0.5">
                Scaffolds a placeholder under{" "}
                <span className="font-mono">
                  {conceptModal.nudge.projectSlug}/wiki/concepts/
                </span>
              </div>
            </div>
            <div className="px-4 py-4">
              <label className="block text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-1">
                Concept title
              </label>
              <input
                autoFocus
                value={conceptModal.title}
                onChange={(e) =>
                  setConceptModal(
                    (prev) => prev && { ...prev, title: e.target.value }
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !conceptBusy) submitConcept();
                  if (e.key === "Escape" && !conceptBusy) setConceptModal(null);
                }}
                placeholder="e.g. Evaluation Harness"
                className="w-full px-2.5 py-1.5 text-[13px] bg-[var(--bg-2)] border border-[var(--border-input)] rounded-md text-[var(--text-1)] placeholder:text-[var(--text-4)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                disabled={conceptBusy}
                onClick={() => setConceptModal(null)}
                className="px-3 py-1.5 text-[12px] rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={conceptBusy || !conceptModal.title.trim()}
                onClick={submitConcept}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] rounded-md bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {conceptBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                Create page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
