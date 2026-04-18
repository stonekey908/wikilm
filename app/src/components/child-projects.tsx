"use client";

import { useProject } from "@/components/project-switcher";
import { ChevronRight } from "lucide-react";

interface Props {
  parentId: number;
}

/**
 * Shows a row of cards for each direct child of the given parent project.
 * Clicking a card switches the active project to that child. Renders null
 * when the parent has no children, so it's safe to always mount.
 *
 * Uses the flat projects list from `useProject()` rather than a dedicated
 * endpoint — keeps things simple and reuses the already-computed pageCount.
 */
export function ChildProjects({ parentId }: Props) {
  const { projects, setActiveProject } = useProject();

  const children = projects.filter((p) => p.parentId === parentId);
  if (children.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2 px-1">
        Children
      </div>
      <div className="flex flex-wrap gap-2">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => setActiveProject(child)}
            className="group flex items-center gap-2.5 pl-0 pr-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all cursor-pointer text-left min-w-[180px]"
            title={`Switch to ${child.name}`}
          >
            {/* Color stripe */}
            <span
              className="w-1 self-stretch rounded-l-lg shrink-0"
              style={{ background: child.color }}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-[550] text-[var(--text-1)] truncate">
                {child.name}
              </div>
              <div className="text-[11px] text-[var(--text-4)] mt-0.5">
                {child.pageCount} page{child.pageCount === 1 ? "" : "s"}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-4)] group-hover:text-[var(--text-2)] shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
