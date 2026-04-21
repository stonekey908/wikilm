"use client";

import { useEffect, useRef, useState } from "react";
import { useProject } from "@/components/project-switcher";
import { EditorialProjectTree } from "./editorial-project-tree";

export function ProjectSwitcherDropdown() {
  const { activeProject } = useProject();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Close on project change
  useEffect(() => {
    setOpen(false);
  }, [activeProject?.id]);

  const parentCrumb = activeProject?.slug?.includes("/")
    ? activeProject.slug.split("/").slice(0, -1).join(" / ")
    : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className={`proj-switch${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Switch project"
      >
        <span className="dot" style={{ background: activeProject?.color ?? "var(--ink)" }} />
        <span className="body">
          <span className="name">{activeProject?.name ?? "No project"}</span>
          {parentCrumb && <span className="crumb">{parentCrumb}</span>}
        </span>
        <svg className="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="proj-switch-pop">
          <div className="proj-switch-pop-head">
            <span>Projects</span>
            <button type="button" className="x" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <div style={{ padding: "6px 8px" }}>
            <EditorialProjectTree />
          </div>
        </div>
      )}
    </div>
  );
}
