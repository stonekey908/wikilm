"use client";

import { usePathname } from "next/navigation";
import { useTweaks } from "./tweaks-provider";
import { FOLIO, viewFromPath } from "./folio-map";
import { JobBeacon } from "./job-beacon";

export function EditorialTopbar() {
  const pathname = usePathname();
  const { togglePanel } = useTweaks();

  const view = viewFromPath(pathname);
  const folio = FOLIO[view];

  return (
    <header className="topbar">
      <div className="folio">
        <span className="n">§</span>
        <span>{folio.num}</span>
        <span className="sep">·</span>
        <span className="cur">{folio.name}</span>
      </div>

      <div
        className="omnibar"
        role="button"
        tabIndex={0}
        onClick={() => window.dispatchEvent(new Event("editorial:open-palette"))}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.dispatchEvent(new Event("editorial:open-palette"));
          }
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="7" cy="7" r="5" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </svg>
        <span>
          <em style={{ fontFamily: "var(--font-inst)", fontStyle: "italic", color: "var(--ink-2)" }}>
            ask, search, command
          </em>
        </span>
        <span className="kbd">
          <span>⌘</span>
          <span>K</span>
        </span>
      </div>

      <div style={{ display: "flex", gap: "4px" }}>
        <JobBeacon />
        <button
          className="icon-btn"
          title="Help — press ? anywhere"
          type="button"
          onClick={() => window.dispatchEvent(new Event("editorial:open-help"))}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="6.25" />
            <path d="M6 6.2c0-1.1 0.9-2 2-2s2 0.9 2 2c0 1-0.6 1.4-1.3 1.8C8.2 8.4 8 8.8 8 9.5" strokeLinecap="round" />
            <circle cx="8" cy="12" r="0.6" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button className="icon-btn" title="Set type" type="button" onClick={togglePanel}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="5" cy="4" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <line x1="6.5" y1="4" x2="14" y2="4" />
            <line x1="2" y1="8" x2="9.5" y2="8" />
            <line x1="6.5" y1="12" x2="14" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
