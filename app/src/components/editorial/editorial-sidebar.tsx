"use client";

import { useRouter, usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FOLIO, VIEW_ORDER, viewFromPath, type EditorialView } from "./folio-map";
import { ProjectSwitcherDropdown } from "./project-switcher-dropdown";
import { ChatSessionsSidebar } from "./chat-sessions-sidebar";

const NAV_ICONS: Record<EditorialView, React.ReactNode> = {
  dashboard: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </svg>
  ),
  wiki: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 2h8l2 2v10H3z" />
      <line x1="5" y1="6" x2="11" y2="6" />
      <line x1="5" y1="9" x2="11" y2="9" />
      <line x1="5" y1="12" x2="9" y2="12" />
    </svg>
  ),
  sources: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
    </svg>
  ),
  chat: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 3h12v8H5l-3 3z" />
      <line x1="5" y1="6" x2="11" y2="6" />
      <line x1="5" y1="8.5" x2="9" y2="8.5" />
    </svg>
  ),
  lint: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 13l4-1 7-7-3-3-7 7z" />
      <line x1="11" y1="3" x2="13" y2="5" />
    </svg>
  ),
  jobs: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4v4l2.5 2.5" />
    </svg>
  ),
  graph: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2" />
      <circle cx="3" cy="3" r="1.5" />
      <circle cx="13" cy="3" r="1.5" />
      <circle cx="3" cy="13" r="1.5" />
      <circle cx="13" cy="13" r="1.5" />
      <line x1="6.5" y1="6.5" x2="4" y2="4" />
      <line x1="9.5" y1="6.5" x2="12" y2="4" />
      <line x1="6.5" y1="9.5" x2="4" y2="12" />
      <line x1="9.5" y1="9.5" x2="12" y2="12" />
    </svg>
  ),
  compose: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12l1-4 7-7 3 3-7 7-4 1z" />
    </svg>
  ),
  settings: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
    </svg>
  ),
};

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function EditorialSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [dateLabel, setDateLabel] = useState<string>("");

  useEffect(() => {
    const d = new Date();
    setDateLabel(`${DAYS[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`);
  }, []);

  const active = viewFromPath(pathname);
  const go = (view: EditorialView) => router.push(FOLIO[view].path);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  return (
    <aside className="side">
      <div className="side-head">
        <div className="wax">W</div>
        <div className="masthead">
          <span className="vol">Vol. I · No. 284</span>
          <span className="name">
            Wiki<em>LM</em>
          </span>
        </div>
        <div />
        <div className="side-date">
          <span>{dateLabel}</span>
          <span>v0.4.2</span>
        </div>
      </div>

      <ProjectSwitcherDropdown />

      <nav className="side-nav">
        <div className="sb-lab">Sections</div>
        {VIEW_ORDER.map((v) => {
          const f = FOLIO[v];
          return (
            <button
              key={v}
              className={`si${active === v ? " active" : ""}`}
              onClick={() => go(v)}
              type="button"
            >
              <span className="si-num">{f.num}</span>
              <span className="si-icon">{NAV_ICONS[v]}</span>
              <span className="si-text">{f.label}</span>
              <span className="si-count"></span>
            </button>
          );
        })}

        <button
          type="button"
          className={`sb-lab collapsible${chatCollapsed ? " collapsed" : ""}`}
          onClick={() => setChatCollapsed((v) => !v)}
        >
          <span>Conversations</span>
          <span className="chev-sm">▾</span>
        </button>
        <div className={`sb-collapsed-body${chatCollapsed ? "" : " open"}`}>
          <Suspense fallback={null}>
            <ChatSessionsSidebar />
          </Suspense>
        </div>
      </nav>

    </aside>
  );
}
