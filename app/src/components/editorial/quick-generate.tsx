"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";

type OutputTypeId = "report" | "cheat" | "summary" | "deck" | "infographic";

const FORMATS: { id: OutputTypeId; label: string; sub: string }[] = [
  { id: "summary", label: "Executive", sub: "One-page brief" },
  { id: "cheat", label: "Cheat sheet", sub: "Print-ready" },
  { id: "report", label: "Long report", sub: "Cited narrative" },
  { id: "deck", label: "Briefing deck", sub: "Slides (Marp)" },
  { id: "infographic", label: "Infographic", sub: "Visual HTML" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  seedNudge?: string;
}

export function QuickGenerateModal({ open, onClose, seedNudge }: Props) {
  const router = useRouter();
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const [type, setType] = useState<OutputTypeId>("cheat");
  const [nudge, setNudge] = useState(seedNudge ?? "");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function go() {
    if (!activeProject) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/outputs/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, scope: "project", nudge: nudge.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      addToast({
        type: "success",
        title: `Dictating · ${FORMATS.find((f) => f.id === type)!.label}`,
        description: "Watch Dispatch — it'll appear in Outputs when ready.",
      });
      onClose();
      router.push("/jobs");
    } catch (err: unknown) {
      addToast({ type: "error", title: err instanceof Error ? err.message : "Couldn't start generation" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="note-modal-bg" onClick={() => !busy && onClose()}>
      <div className="note-modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="note-modal-head">
          <h3>
            Generate <em>output</em>
          </h3>
          <button className="x" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>
        <div className="note-modal-body">
          <div className="note-field">
            <span className="lab">Format</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setType(f.id)}
                  style={{
                    padding: "10px 8px",
                    border: type === f.id ? "1.5px solid var(--ink)" : "1.5px solid var(--rule-faint)",
                    background: type === f.id ? "var(--ink)" : "var(--paper)",
                    color: type === f.id ? "var(--paper)" : "var(--ink-2)",
                    cursor: "pointer",
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    letterSpacing: "-0.01em",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{f.label}</div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginTop: 3,
                      opacity: 0.7,
                    }}
                  >
                    {f.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <label className="note-field">
            <span className="lab">Focus (optional)</span>
            <textarea
              value={nudge}
              onChange={(e) => setNudge(e.target.value)}
              placeholder="Steer what the output emphasises — leave blank for a general overview."
              rows={3}
              disabled={busy}
            />
          </label>
        </div>
        <div className="note-modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn primary" onClick={go} disabled={busy || !activeProject}>
            {busy ? "Queueing…" : "Dictate →"}
          </button>
        </div>
      </div>
    </div>
  );
}
