"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PortalToBody } from "@/components/editorial/portal-to-body";

// Keep this list short — the modal is a glance card, not the full manual.
// /help is the full knowledge bank; the modal just points at it.
const QUICK_ITEMS: Array<[string, string]> = [
  ["Intake", "Drop files, paste URLs, type notes, commission research. Approve pending sources. ⌘3"],
  ["Wiki", "Article reader with hover-previewed wikilinks + backlinks. ⌘2"],
  ["Salon", "Chat over the wiki — ask it how to do anything. Save a thread as a note. ⌘4"],
  ["The Edit", "Lint — orphan, dangling-wikilink, contradiction findings. Fix queues a repair. ⌘5"],
  ["Dispatch", "Every running job — ingest, research, lint, output. Live progress + cancel. ⌘6"],
  ["Dictation", "Generate report / summary / cheat sheet / deck / infographic. ⌘7"],
  ["Press", "Model routing per job type, provider availability, UI tokens. ⌘8"],
];

const SHORTCUTS: Array<[string, string]> = [
  ["⌘K", "Command palette — navigate, search, generate, ask."],
  ["?", "Open this help."],
  ["⌘1–⌘9", "Jump to any top-level page."],
  ["Esc", "Close any modal."],
];

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
    <PortalToBody>
    <div className="note-modal-bg" onClick={() => setOpen(false)}>
      <div
        className="note-modal"
        style={{ width: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="note-modal-head" style={{ gap: 10 }}>
          <h3>
            Help · <em>WikiLM</em>
          </h3>
          <Link
            href="/help"
            onClick={() => setOpen(false)}
            className="btn sm primary"
            style={{ textDecoration: "none", whiteSpace: "nowrap", marginLeft: "auto" }}
          >
            Open full help →
          </Link>
          <button className="x" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <div className="note-modal-body">
          <p
            style={{
              fontFamily: "var(--font-inst)",
              fontStyle: "italic",
              fontSize: 16,
              color: "var(--ink-2)",
              marginBottom: 18,
              maxWidth: "60ch",
            }}
          >
            Drop sources in <em>Intake</em>. WikiLM reads them, writes source + entity + concept pages,
            links them with <em>[[wikilinks]]</em>, and keeps a running project overview. Ask questions
            in the <em>Salon</em>, lint the graph in <em>The Edit</em>, generate polished outputs in{" "}
            <em>Dictation</em>.
          </p>

          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {QUICK_ITEMS.map(([title, desc]) => (
              <div
                key={title}
                style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, alignItems: "baseline" }}
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
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-2)" }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              paddingTop: 14,
              borderTop: "1px dashed var(--rule-faint)",
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              rowGap: 6,
              columnGap: 14,
              marginBottom: 18,
            }}
          >
            {SHORTCUTS.map(([key, desc]) => (
              <div key={key} style={{ display: "contents" }}>
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
                  {key}
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 13.5, color: "var(--ink-2)" }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              paddingTop: 14,
              borderTop: "1.5px solid var(--ink)",
              fontFamily: "var(--font-inst)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-3)",
              textAlign: "center",
            }}
          >
            Full knowledge bank → top-right button
          </div>
        </div>
      </div>
    </div>
    </PortalToBody>
  );
}
