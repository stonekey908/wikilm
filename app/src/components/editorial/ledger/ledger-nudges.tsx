"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { useProject } from "@/components/project-switcher";

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

type Group = "promotion" | "theme" | "gap";

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

  async function research(n: DashboardNudge) {
    markBusy(n.id, true);
    try {
      const res = await fetch("/api/sources/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: n.title, projectId: n.projectId }),
      });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Commissioning research" });
      setHidden((p) => new Set(p).add(n.id));
    } catch {
      addToast({ type: "error", title: "Research failed to start" });
    } finally {
      markBusy(n.id, false);
    }
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

  if (visible.length === 0) {
    return (
      <div style={{ fontFamily: "var(--font-inst)", fontStyle: "italic", fontSize: 13, color: "var(--ink-3)", padding: "8px 0" }}>
        No nudges. Run a lint pass to surface promotions, themes, and gaps.
      </div>
    );
  }

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
