"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { useProject } from "@/components/project-switcher";

// router is used by research() handoff to /sources?tab=research

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
  suggestedQuestion: DashboardNudge[];
  missingCrossRef: DashboardNudge[];
  missingConcept: DashboardNudge[];
  projectGroupTotals: {
    suggestedQuestion: number;
    missingCrossRef: number;
    missingConcept: number;
  };
}

type Group = "promotion" | "theme" | "gap";
type ProjectGroup = "suggestedQuestion" | "missingCrossRef" | "missingConcept";

const GROUP_LABEL: Record<Group, string> = {
  promotion: "Promote",
  theme: "Theme",
  gap: "Gap",
};

const GROUP_CLASS: Record<Group, string> = {
  promotion: "",
  theme: "blue",
  gap: "red",
};

const PROJECT_GROUP_META: Record<
  ProjectGroup,
  { label: string; countKey: keyof NudgesResponse["projectGroupTotals"]; pillClass: string }
> = {
  suggestedQuestion: { label: "Suggested questions", countKey: "suggestedQuestion", pillClass: "" },
  missingCrossRef: { label: "Missing cross-refs", countKey: "missingCrossRef", pillClass: "blue" },
  missingConcept: { label: "Missing concepts", countKey: "missingConcept", pillClass: "red" },
};

export function LedgerMarginalia() {
  const router = useRouter();
  const { addToast } = useToast();
  const { activeProject } = useProject();
  const activeProjectId = activeProject?.id ?? null;
  const [data, setData] = useState<NudgesResponse | null>(null);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [conceptModal, setConceptModal] = useState<{ nudge: DashboardNudge; title: string } | null>(null);
  const [conceptBusy, setConceptBusy] = useState(false);
  // Collapsed by default so lint findings don't flood the ledger.
  const [expandedGroups, setExpandedGroups] = useState<Set<ProjectGroup>>(new Set());

  const fetchNudges = useCallback(async () => {
    if (activeProjectId === null) return;
    try {
      const res = await fetch(`/api/dashboard/nudges?projectId=${activeProjectId}`);
      if (res.ok) setData((await res.json()) as NudgesResponse);
    } catch {}
  }, [activeProjectId]);

  useEffect(() => {
    setHidden(new Set());
    setBusy(new Set());
    fetchNudges();
  }, [fetchNudges]);

  const visible = useMemo(() => {
    if (!data) return [] as { group: Group; nudge: DashboardNudge }[];
    const out: { group: Group; nudge: DashboardNudge }[] = [];
    (["promotion", "theme", "gap"] as Group[]).forEach((g) => {
      data[g].filter((n) => !hidden.has(n.id)).forEach((nudge) => out.push({ group: g, nudge }));
    });
    return out;
  }, [data, hidden]);

  function markBusy(id: number, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function dismiss(n: DashboardNudge) {
    markBusy(n.id, true);
    try {
      const res = await fetch(`/api/lint/findings/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error();
      setHidden((p) => new Set(p).add(n.id));
      addToast({ type: "success", title: "Dismissed" });
      void fetchNudges();
    } catch {
      addToast({ type: "error", title: "Couldn't dismiss" });
    } finally {
      markBusy(n.id, false);
    }
  }

  async function promote(n: DashboardNudge) {
    if (!n.targetPage) {
      addToast({ type: "error", title: "No target page" });
      return;
    }
    const colon = n.targetPage.lastIndexOf(":");
    if (colon === -1) {
      addToast({ type: "error", title: "Invalid target" });
      return;
    }
    const childSlug = n.targetPage.slice(0, colon);
    const pageSlug = n.targetPage.slice(colon + 1);
    markBusy(n.id, true);
    try {
      const res = await fetch(`/api/projects/${n.projectId}/promote-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: n.id, childSlug, pageSlug }),
      });
      if (!res.ok) throw new Error();
      setHidden((p) => new Set(p).add(n.id));
      addToast({ type: "success", title: "Promoted" });
      void fetchNudges();
    } catch {
      addToast({ type: "error", title: "Couldn't promote" });
    } finally {
      markBusy(n.id, false);
    }
  }

  function research(n: DashboardNudge) {
    // Hand the research off to the real streaming UI so the user watches
    // candidates land in real time and can approve/skip them. Fire-and-
    // forget against /api/sources/research streams to a reader we abandon,
    // which was why pressing "Research" did nothing visible.
    router.push(`/sources?tab=research&topic=${encodeURIComponent(n.title)}`);
    setHidden((p) => new Set(p).add(n.id));
  }

  async function createConcept() {
    if (!conceptModal) return;
    setConceptBusy(true);
    try {
      const res = await fetch("/api/wiki/concept-scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: conceptModal.nudge.projectId,
          title: conceptModal.title,
          findingId: conceptModal.nudge.id,
        }),
      });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Concept created" });
      setHidden((p) => new Set(p).add(conceptModal.nudge.id));
      setConceptModal(null);
      void fetchNudges();
    } catch {
      addToast({ type: "error", title: "Couldn't create concept" });
    } finally {
      setConceptBusy(false);
    }
  }

  const projectGroupTotals = data?.projectGroupTotals ?? {
    suggestedQuestion: 0,
    missingCrossRef: 0,
    missingConcept: 0,
  };
  const hasAnyProjectGroup =
    projectGroupTotals.suggestedQuestion +
      projectGroupTotals.missingCrossRef +
      projectGroupTotals.missingConcept >
    0;

  function toggleGroup(g: ProjectGroup) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  if (visible.length === 0 && !hasAnyProjectGroup) {
    return (
      <div style={{ fontFamily: "var(--font-inst)", fontStyle: "italic", fontSize: 13, color: "var(--ink-3)", padding: "8px 0" }}>
        No nudges. Run a lint pass to surface suggestions, missing concepts, and cross-refs.
      </div>
    );
  }

  const projectGroups: ProjectGroup[] = ["suggestedQuestion", "missingCrossRef", "missingConcept"];

  return (
    <>
      {visible.map(({ group, nudge }) => {
        const isBusy = busy.has(nudge.id);
        const klass = GROUP_CLASS[group];
        return (
          <div key={nudge.id} className={`mark${klass ? ` ${klass}` : ""}`}>
            <div className="k">{GROUP_LABEL[group]}</div>
            <p>
              <b>{nudge.title}</b>
              {nudge.description ? ` · ${nudge.description}` : null}
            </p>
            <div className="mark-act">
              {group === "promotion" && nudge.targetPage && (
                <button className="btn sm primary" onClick={() => promote(nudge)} disabled={isBusy}>
                  Promote
                </button>
              )}
              {group === "gap" && (
                <button className="btn sm primary" onClick={() => research(nudge)} disabled={isBusy}>
                  Research
                </button>
              )}
              {(group === "theme" || group === "gap") && (
                <button
                  className="btn sm"
                  onClick={() => setConceptModal({ nudge, title: nudge.title })}
                  disabled={isBusy}
                >
                  Create concept
                </button>
              )}
              <button className="btn sm ghost" onClick={() => dismiss(nudge)} disabled={isBusy}>
                Dismiss
              </button>
            </div>
          </div>
        );
      })}

      {/* Project-scope lint highlights — collapsed by default so the ledger
          stays scannable. Clicking the header reveals the first few items;
          "View more" jumps to the full Lint page. */}
      {projectGroups.map((g) => {
        const meta = PROJECT_GROUP_META[g];
        const items = (data?.[g] ?? []) as DashboardNudge[];
        const total = projectGroupTotals[meta.countKey];
        if (total === 0) return null;
        const expanded = expandedGroups.has(g);
        const hidden = Math.max(0, total - items.length);
        return (
          <div key={g} className={`mark-group${meta.pillClass ? ` ${meta.pillClass}` : ""}`}>
            <button
              type="button"
              className="mark-group-head"
              onClick={() => toggleGroup(g)}
              aria-expanded={expanded}
            >
              <span
                className="mark-group-chev"
                style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
              >
                ▾
              </span>
              <span className="mark-group-label">{meta.label}</span>
              <span className="mark-group-count">{total}</span>
            </button>
            {expanded && (
              <div className="mark-group-body">
                {items.map((n) => (
                  <div key={n.id} className="mark-group-row">
                    <p>
                      <b>{n.title}</b>
                      {n.description ? ` · ${n.description}` : null}
                    </p>
                    {n.targetPage && (
                      <div className="mark-group-target">
                        <code>{n.targetPage}</code>
                      </div>
                    )}
                  </div>
                ))}
                <div className="mark-group-foot">
                  <button
                    type="button"
                    className="btn sm primary"
                    onClick={() => router.push("/lint")}
                  >
                    {hidden > 0 ? `View ${hidden} more in Lint →` : "Open in Lint →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <style jsx>{`
        .mark-group {
          margin: 10px 0;
          padding: 0;
          border-left: 2px solid var(--rule);
        }
        .mark-group.blue { border-left-color: var(--blue, #3b82f6); }
        .mark-group.red { border-left-color: var(--red, #c0341c); }
        .mark-group-head {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          background: none;
          border: none;
          padding: 6px 10px 6px 12px;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: background 140ms;
        }
        .mark-group-head:hover { background: var(--paper-2); }
        .mark-group-chev {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-4);
          transition: transform 140ms;
        }
        .mark-group-label {
          flex: 1;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-2);
        }
        .mark-group-count {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-4);
          font-variant-numeric: tabular-nums;
        }
        .mark-group-body {
          padding: 6px 12px 10px;
          display: grid;
          gap: 8px;
        }
        .mark-group-row {
          font-family: var(--font-serif);
          font-size: 13px;
          line-height: 1.45;
          color: var(--ink-2);
        }
        .mark-group-row p {
          margin: 0;
        }
        .mark-group-target {
          margin-top: 2px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-4);
        }
        .mark-group-foot {
          margin-top: 4px;
          display: flex;
          justify-content: flex-end;
        }
      `}</style>

      {conceptModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
          }}
          onClick={() => !conceptBusy && setConceptModal(null)}
        >
          <div
            style={{
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
              boxShadow: "8px 8px 0 var(--ink)",
              width: 420,
              padding: 22,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "-0.015em",
                marginBottom: 12,
              }}
            >
              Create <em style={{ fontFamily: "var(--font-inst)", fontStyle: "italic", color: "var(--accent)", fontWeight: 400 }}>concept</em>
            </div>
            <input
              autoFocus
              type="text"
              value={conceptModal.title}
              onChange={(e) => setConceptModal({ ...conceptModal, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createConcept();
                if (e.key === "Escape" && !conceptBusy) setConceptModal(null);
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                border: "1px solid var(--rule)",
                background: "var(--paper-2)",
                outline: "none",
                fontFamily: "inherit",
                color: "inherit",
                marginBottom: 14,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn sm ghost" onClick={() => setConceptModal(null)} disabled={conceptBusy}>
                Cancel
              </button>
              <button className="btn sm primary" onClick={() => void createConcept()} disabled={conceptBusy || !conceptModal.title.trim()}>
                {conceptBusy ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
