"use client";

import { usePathname } from "next/navigation";
import { useTweaks } from "./tweaks-provider";
import { FOLIO, viewFromPath } from "./folio-map";

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

      <div className="omnibar" aria-label="Command palette (coming in Phase 7)">
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
        <button className="icon-btn has-dot" title="Inbox" type="button">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 6l2-3h8l2 3v7H2z" />
            <path d="M2 6h4l1 2h2l1-2h4" />
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
