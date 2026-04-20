"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTweaks } from "./tweaks-provider";
import { FOLIO, VIEW_ORDER, viewFromPath, type EditorialView } from "./folio-map";

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
};

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function EditorialSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, setTweak } = useTweaks();
  const [dateLabel, setDateLabel] = useState<string>("");

  useEffect(() => {
    const d = new Date();
    setDateLabel(`${DAYS[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`);
  }, []);

  const active = viewFromPath(pathname);
  const go = (view: EditorialView) => router.push(FOLIO[view].path);
  const toggleSidebar = () =>
    setTweak("sidebar", state.sidebar === "open" ? "collapsed" : "open");

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

      <button className="side-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 4L6 8l4 4" />
        </svg>
      </button>

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

        <div className="sb-lab">Projects</div>
        <div className="proj">
          <span className="dot" style={{ background: "var(--accent)" }}></span>
          <span className="t">ai / agents</span>
          <span className="c">42</span>
        </div>
        <div className="proj">
          <span className="dot" style={{ background: "var(--blue)" }}></span>
          <span className="t">design-systems</span>
          <span className="c">18</span>
        </div>
        <div className="proj">
          <span className="dot" style={{ background: "var(--amber)" }}></span>
          <span className="t">distributed</span>
          <span className="c">7</span>
        </div>
        <div className="proj">
          <span className="dot" style={{ background: "var(--green)" }}></span>
          <span className="t">biology / notes</span>
          <span className="c">23</span>
        </div>

        <div className="sb-lab">Pinned</div>
        <div className="proj" onClick={() => go("wiki")}>
          <span className="dot" style={{ background: "var(--ink)" }}></span>
          <span className="t">Tool use in LLMs</span>
        </div>
        <div className="proj" onClick={() => go("wiki")}>
          <span className="dot" style={{ background: "var(--ink)" }}></span>
          <span className="t">Agent memory</span>
        </div>
      </nav>

      <div className="side-foot">
        <div className="stamp">EL</div>
        <div className="who">
          <b>Ellie Larimer</b>
          <small>Editor · Personal</small>
        </div>
      </div>
    </aside>
  );
}
