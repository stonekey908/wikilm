"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  X,
  Loader2,
  FileText,
  FileDown,
  AlertCircle,
  CheckCircle2,
  Globe,
  Folder,
} from "lucide-react";

// Keep in sync with the server-side registry. Only `id` and `label` are
// used by the UI; additional fields are read from the API response so we
// don't fork the canonical definitions.
const UI_TYPE_DESCRIPTIONS: Record<string, string> = {
  report:
    "Structured Executive Summary → Findings → Evidence → Gaps → Next Steps. Exports .md + .docx.",
  cheat: "Dense one-pager — top facts, quotes, links. Exports .md + .docx.",
  summary: "500-word plain-English brief. Exports .md + .docx.",
  deck: "6–12 slide Marp deck. Exports .md + .pdf + .pptx.",
  infographic:
    "Single HTML / SVG with stats + diagram. Exports .html + .png.",
};

interface GenerateOutputModalProps {
  open: boolean;
  projectId: number;
  onClose: () => void;
  /** Invoked after a successful generation so the parent can refresh its page list. */
  onGenerated?: () => void;
}

interface EnabledType {
  id: string;
  label: string;
  primaryExt: string;
  derivedExts: string[];
}

type Scope = "project" | "subtree";

type Phase =
  | { kind: "idle" }
  | { kind: "queued"; jobId: number }
  | { kind: "running"; jobId: number }
  | {
      kind: "done";
      baseSlug: string;
      type: string;
      extensions: string[];
    }
  | { kind: "error"; message: string };

const POLL_INTERVAL_MS = 1500;

export function GenerateOutputModal({
  open,
  projectId,
  onClose,
  onGenerated,
}: GenerateOutputModalProps) {
  // Enabled types are hard-coded here to match the server registry. Slice 1
  // ships `report`; slices 2-4 append to both sides as they land.
  const ENABLED_TYPES: EnabledType[] = useMemo(
    () => [
      { id: "report", label: "Report", primaryExt: "md", derivedExts: ["docx"] },
      { id: "cheat", label: "Cheat sheet", primaryExt: "md", derivedExts: ["docx"] },
      { id: "summary", label: "Executive summary", primaryExt: "md", derivedExts: ["docx"] },
      { id: "deck", label: "Briefing deck", primaryExt: "md", derivedExts: ["pdf", "pptx"] },
      { id: "infographic", label: "Infographic", primaryExt: "html", derivedExts: ["png"] },
    ],
    []
  );

  const [selectedType, setSelectedType] = useState<string>(ENABLED_TYPES[0]?.id ?? "");
  const [scope, setScope] = useState<Scope>("project");
  const [nudge, setNudge] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // Cancel token for the in-flight poll loop. Closing the modal or unmounting
  // sets this true so pending `fetch` callbacks are ignored — prevents
  // "setState on unmounted component" warnings and avoids racy updates.
  const cancelRef = useRef<{ cancelled: boolean } | null>(null);

  // Reset state when modal opens fresh
  useEffect(() => {
    if (!open) return;
    setPhase({ kind: "idle" });
    setNudge("");
    setScope("project");
    setSelectedType(ENABLED_TYPES[0]?.id ?? "");
  }, [open, ENABLED_TYPES]);

  // Cancel any in-flight poll when the modal closes or unmounts
  useEffect(() => {
    if (open) return;
    if (cancelRef.current) {
      cancelRef.current.cancelled = true;
      cancelRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (cancelRef.current) cancelRef.current.cancelled = true;
    };
  }, []);

  // ESC dismisses the modal at any phase. If a job is running it stays
  // running in the background — users can watch it from the sidebar panel
  // or /jobs page.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleGenerate = useCallback(async () => {
    const typeDef = ENABLED_TYPES.find((t) => t.id === selectedType);
    if (!typeDef) return;
    // Cancel any previous in-flight loop from an earlier generation in the
    // same modal session (unlikely, but possible if user hit Generate twice).
    if (cancelRef.current) cancelRef.current.cancelled = true;
    const token = { cancelled: false };
    cancelRef.current = token;

    setPhase({ kind: "queued", jobId: -1 });
    try {
      const res = await fetch(`/api/projects/${projectId}/outputs/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          scope,
          nudge: nudge.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as {
        jobId: number;
        baseSlug: string;
        type: string;
      };
      setPhase({ kind: "running", jobId: data.jobId });
      pollUntilDone(data.jobId, data.baseSlug, typeDef, token, setPhase, onGenerated);
    } catch (err) {
      if (!token.cancelled) {
        setPhase({
          kind: "error",
          message: err instanceof Error ? err.message : "Generate failed",
        });
      }
    }
  }, [projectId, selectedType, scope, nudge, ENABLED_TYPES, onGenerated]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const inFlight = phase.kind === "queued" || phase.kind === "running";
  const ENABLED_TYPE = ENABLED_TYPES.find((t) => t.id === selectedType);

  // Portal to document.body so `position: fixed` resolves against the real
  // viewport — not the `zoom: var(--fs-scale)` ancestor that wraps .content.
  // Without the portal, clicking Generate Output from a mid-scroll wiki page
  // opens the modal off-screen (user has to scroll down to find it).
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={(e) => {
        // Dismissing the modal mid-job is fine — the job keeps running in
        // the background. User can check progress in the sidebar panel.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lg)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: "rgba(236,72,153,0.1)" }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "var(--chart-5)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-[650] text-[var(--text-1)]">
              Generate output
            </div>
            <div className="text-[12px] text-[var(--text-4)]">
              Turn this wiki into a report, deck, or one-pager.
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors"
            aria-label="Close"
            title={inFlight ? "Close — job keeps running in the background" : "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Type picker */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
              Output type
            </div>
            <div className="grid grid-cols-1 gap-2">
              {ENABLED_TYPES.map((t) => {
                const isActive = selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    disabled={inFlight}
                    className={`text-left px-4 py-3 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? "border-[var(--chart-5)] bg-[rgba(236,72,153,0.04)]"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start gap-3">
                      <FileText
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: isActive ? "var(--chart-5)" : "var(--text-3)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-[600] text-[var(--text-1)]">
                          {t.label}
                        </div>
                        <div className="text-[12px] text-[var(--text-3)] mt-0.5">
                          {UI_TYPE_DESCRIPTIONS[t.id]}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* Preview rows for types that ship in later slices so the UI
                  communicates the full scope even pre-GA. */}
              {(["cheat", "summary", "deck", "infographic"] as const)
                .filter((id) => !ENABLED_TYPES.some((t) => t.id === id))
                .map((id) => (
                  <div
                    key={id}
                    className="text-left px-4 py-3 rounded-lg border border-dashed border-[var(--border)] opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-4)]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-[600] text-[var(--text-2)] flex items-center gap-1.5">
                          {id === "cheat"
                            ? "Cheat sheet"
                            : id === "summary"
                              ? "Executive summary"
                              : id === "deck"
                                ? "Briefing deck"
                                : "Infographic"}
                          <span className="text-[10px] font-medium px-1.5 py-px rounded bg-[var(--bg-2)] text-[var(--text-4)] uppercase tracking-wider">
                            soon
                          </span>
                        </div>
                        <div className="text-[12px] text-[var(--text-4)] mt-0.5">
                          {UI_TYPE_DESCRIPTIONS[id]}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Scope */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
              Scope
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "project", label: "This project", icon: Folder },
                { id: "subtree", label: "Whole subtree", icon: Globe },
              ] as const).map((s) => {
                const isActive = scope === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setScope(s.id)}
                    disabled={inFlight}
                    className={`px-3 py-2 rounded-lg border text-[13px] font-[550] flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? "border-[var(--chart-5)] bg-[rgba(236,72,153,0.04)] text-[var(--text-1)]"
                        : "border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]"
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nudge */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
              Focus (optional)
            </label>
            <textarea
              value={nudge}
              onChange={(e) => setNudge(e.target.value)}
              disabled={inFlight}
              placeholder='e.g. "focus on implications for B2B marketers" or "audience: technical"'
              className="w-full px-3 py-2 text-[13px] bg-[var(--bg-1)] border border-[var(--border-input)] rounded-md text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--chart-5)] transition-all resize-none min-h-[72px] disabled:opacity-60"
              rows={3}
            />
          </div>

          {/* Status panel */}
          {phase.kind !== "idle" && (
            <div className="border-t border-[var(--border)] pt-4">
              {phase.kind === "queued" && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Queued…
                </div>
              )}
              {phase.kind === "running" && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-3)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating — this usually takes 30–90 seconds.
                </div>
              )}
              {phase.kind === "error" && (
                <div className="flex items-start gap-2 text-[13px] text-[var(--orange)]">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-[600]">Generation failed</div>
                    <div className="text-[var(--text-3)] mt-0.5 font-mono text-[12px] whitespace-pre-wrap">
                      {phase.message}
                    </div>
                  </div>
                </div>
              )}
              {phase.kind === "done" && (
                <div>
                  <div className="flex items-center gap-2 text-[13px] text-[var(--green)] mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-[600]">Generated</span>
                    <span className="text-[var(--text-4)] font-mono text-[12px]">
                      {phase.baseSlug}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {phase.extensions.map((ext) => (
                      <a
                        key={ext}
                        href={`/api/projects/${projectId}/outputs/download?file=${encodeURIComponent(
                          `${phase.baseSlug}.${ext}`
                        )}&download=1`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-card)] text-[12px] font-[550] text-[var(--text-2)] hover:border-[var(--chart-5)] hover:text-[var(--text-1)] transition-all"
                      >
                        <FileDown className="w-3.5 h-3.5" style={{ color: "var(--chart-5)" }} />
                        Download .{ext}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-1)]">
          {/* In-flight: two buttons. "Cancel job" kills the subprocess via
              DELETE /api/claude/job/:id then closes. "Close" dismisses the
              modal and lets the job keep running — user can watch progress
              in the sidebar running-jobs panel. */}
          {inFlight && (
            <>
              <button
                onClick={async () => {
                  if (phase.kind === "queued" || phase.kind === "running") {
                    const id = phase.jobId;
                    if (id > 0) {
                      try {
                        await fetch(`/api/claude/job/${id}`, { method: "DELETE" });
                      } catch {
                        // best-effort
                      }
                    }
                  }
                  onClose();
                }}
                className="px-3 py-1.5 rounded-md text-[13px] font-[550] text-[var(--red)] hover:bg-[var(--red-dim)] transition-colors"
              >
                Cancel job
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-md text-[13px] font-[600] text-[var(--text-1)] bg-[var(--bg-2)] hover:bg-[var(--bg-3)] transition-colors"
                title="Close this dialog — the job keeps running in the background"
              >
                Close — let it run
              </button>
            </>
          )}
          {!inFlight && (
            <>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-md text-[13px] font-[550] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              >
                {phase.kind === "done" ? "Close" : "Cancel"}
              </button>
              {phase.kind !== "done" && (
                <button
                  onClick={handleGenerate}
                  disabled={!ENABLED_TYPE}
                  className="px-4 py-1.5 rounded-md text-[13px] font-[600] text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "var(--chart-5)" }}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Poll loop that carries the baseSlug returned by the POST through to the
 * `done` phase. The `token` lets the component invalidate the loop on close
 * or re-trigger without needing the loop to know React state.
 */
function pollUntilDone(
  jobId: number,
  baseSlug: string,
  typeDef: EnabledType,
  token: { cancelled: boolean },
  setPhase: (p: Phase) => void,
  onGenerated?: () => void
) {
  const extensions = [typeDef.primaryExt, ...typeDef.derivedExts];

  async function tick() {
    if (token.cancelled) return;
    try {
      const res = await fetch(`/api/claude/job/${jobId}`);
      if (!res.ok) throw new Error(`Job lookup failed (${res.status})`);
      const job = await res.json();
      if (token.cancelled) return;

      if (job.status === "queued" || job.status === "running") {
        setPhase(
          job.status === "queued"
            ? { kind: "queued", jobId }
            : { kind: "running", jobId }
        );
        setTimeout(tick, POLL_INTERVAL_MS);
      } else if (job.status === "completed") {
        setPhase({ kind: "done", baseSlug, type: typeDef.id, extensions });
        onGenerated?.();
      } else {
        setPhase({
          kind: "error",
          message: job.error || `Job ${job.status}`,
        });
      }
    } catch (err) {
      if (token.cancelled) return;
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Poll failed",
      });
    }
  }

  tick();
}
