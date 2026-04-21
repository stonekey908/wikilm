"use client";

import { useEffect, useState } from "react";

export function HelpModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const openEvt = () => setOpen(true);
    window.addEventListener("editorial:open-help", openEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("editorial:open-help", openEvt);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="note-modal-bg" onClick={() => setOpen(false)}>
      <div
        className="note-modal"
        style={{ width: 680 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="note-modal-head">
          <h3>
            Help · <em>WikiLM</em>
          </h3>
          <button className="x" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <div className="note-modal-body">
          <p
            style={{
              fontFamily: "var(--font-inst)",
              fontStyle: "italic",
              fontSize: 17,
              color: "var(--ink-2)",
              marginBottom: 22,
              maxWidth: "62ch",
            }}
          >
            Drop sources in the <em>Intake</em>. WikiLM reads them, synthesises entity + concept pages, links them with
            <em> [[wikilinks]]</em>, and keeps a running project overview. Ask it questions in the <em>Salon</em>, run
            health checks in <em>Lint</em>, generate decks or reports in <em>Dictation</em>.
          </p>

          <div style={{ display: "grid", gap: 14 }}>
            {[
              ["01 · Ledger", "Dashboard — stat run, recent pages, nudges, dispatch snapshot, commission research. ⌘1"],
              ["02 · Wiki", "Article reader with hover previews on wikilinks, picker with collapsible type groups. ⌘2"],
              ["03 · Intake", "Drop files / paste URLs / type notes / commission research. Approve pending sources. ⌘3"],
              ["04 · Salon (Chat)", "Ask WikiLM about the project. Multi-turn context. Save a thread as a pending note. ⌘4"],
              ["05 · Lint (The Edit)", "Health-check the wiki. Findings grouped by category — Fix queues a repair, Dismiss hides. ⌘5"],
              ["06 · Dispatch", "Every job running on WikiLM — ingest, research, lint, output generation. Live progress + cancel. ⌘6"],
              ["07 · Map", "Force-directed graph of the wiki. Click a legend category to isolate, wheel to zoom, drag to pan. ⌘7"],
              ["08 · Dictation", "Generate a cheat sheet, report, deck, or infographic. Focus field steers the output. ⌘8"],
              ["09 · Press (Settings)", "Model routing per job type, Ollama/Gemini availability, backup, UI tokens. ⌘9"],
            ].map(([title, desc]) => (
              <div
                key={title as string}
                style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 14, alignItems: "baseline" }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--ink-3)",
                  }}
                >
                  {title}
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, lineHeight: 1.5, color: "var(--ink-2)" }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 26,
              paddingTop: 16,
              borderTop: "1px dashed var(--rule-faint)",
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              rowGap: 10,
              columnGap: 14,
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              ⌘K
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ink-2)" }}>
              Command palette — search pages, run lint, commission research, ask WikiLM, navigate.
            </div>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              ?
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ink-2)" }}>
              Open this help.
            </div>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              Set type
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ink-2)" }}>
              Top-right dotted-sliders icon — swap paper theme, accent, font face, size, leading, grain.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
