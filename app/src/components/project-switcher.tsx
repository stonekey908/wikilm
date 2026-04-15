"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
  color: string;
  sourceCount: number;
  pageCount: number;
}

// Placeholder until multi-project support (STO-1686)
const defaultProject: Project = {
  id: "default",
  name: "Default",
  slug: "default",
  color: "var(--primary)",
  sourceCount: 0,
  pageCount: 0,
};

export function ProjectSwitcher() {
  const [open, setOpen] = useState(false);
  const [projects] = useState<Project[]>([defaultProject]);
  const [activeProject] = useState<Project>(defaultProject);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="mx-2.5 mt-2.5 mb-1 px-2.5 py-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg flex items-center gap-2 w-[calc(100%-20px)] hover:border-[var(--border-strong)] transition-all duration-150"
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: activeProject.color }}
        />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-semibold text-[var(--text-1)] truncate">
            {activeProject.name}
          </div>
          <div className="text-[11px] text-[var(--text-3)]">
            {activeProject.sourceCount} sources &middot;{" "}
            {activeProject.pageCount} pages
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-4)] shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-2.5 w-[220px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] z-50 p-1 mt-1">
          {projects.map((project) => (
            <button
              key={project.id}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md w-full text-[13px] transition-colors duration-100 ${
                project.id === activeProject.id
                  ? "bg-[var(--primary-dim)] text-[var(--primary)] font-[550]"
                  : "text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
              }`}
              onClick={() => setOpen(false)}
            >
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: project.color }}
              />
              {project.name}
            </button>
          ))}
          <div className="h-px bg-[var(--border)] my-1" />
          <button className="flex items-center gap-2 px-2.5 py-2 rounded-md w-full text-[13px] text-[var(--primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100">
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      )}
    </div>
  );
}
