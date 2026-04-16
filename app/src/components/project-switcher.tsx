"use client";

import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { ChevronDown, Plus } from "lucide-react";

interface Project {
  id: number;
  name: string;
  slug: string;
  color: string;
  sourceCount: number;
  pageCount: number;
}

interface ProjectContextValue {
  activeProject: Project | null;
  projects: Project[];
  setActiveProject: (project: Project) => void;
  refreshProjects: () => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used within a ProjectProvider");
  return context;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        if (data.projects.length > 0 && !activeProject) {
          // Restore last used project from localStorage or use first
          const lastSlug = localStorage.getItem("activeProject");
          const found = data.projects.find((p: Project) => p.slug === lastSlug);
          setActiveProjectState(found || data.projects[0]);
        }
      }
    } catch {
      // silently fail
    }
  }, [activeProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  function setActiveProject(project: Project) {
    setActiveProjectState(project);
    localStorage.setItem("activeProject", project.slug);
  }

  return (
    <ProjectContext.Provider
      value={{ activeProject, projects, setActiveProject, refreshProjects: fetchProjects }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function ProjectSwitcher() {
  const { activeProject, projects, setActiveProject, refreshProjects } = useProject();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        setActiveProject(project);
        refreshProjects();
        setNewName("");
        setCreating(false);
        setOpen(false);
      }
    } catch {
      // silently fail
    }
  }

  const display = activeProject || { name: "No project", color: "var(--text-4)", sourceCount: 0, pageCount: 0 };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="mx-2.5 mt-2.5 mb-1 px-2.5 py-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg flex items-center gap-2 w-[calc(100%-20px)] hover:border-[var(--border-strong)] transition-all duration-150"
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: display.color }}
        />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-semibold text-[var(--text-1)] truncate">
            {display.name}
          </div>
          <div className="text-[11px] text-[var(--text-3)]">
            {display.sourceCount} sources &middot; {display.pageCount} pages
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
                activeProject?.id === project.id
                  ? "bg-[var(--primary-dim)] text-[var(--primary)] font-[550]"
                  : "text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
              }`}
              onClick={() => {
                setActiveProject(project);
                setOpen(false);
              }}
            >
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: project.color }}
              />
              {project.name}
            </button>
          ))}

          {projects.length > 0 && <div className="h-px bg-[var(--border)] my-1" />}

          {creating ? (
            <div className="px-2 py-1.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="Project name"
                className="w-full px-2 py-1.5 text-[13px] bg-[var(--bg-2)] border border-[var(--border-input)] rounded-md text-[var(--text-1)] placeholder:text-[var(--text-4)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          ) : (
            <button
              className="flex items-center gap-2 px-2.5 py-2 rounded-md w-full text-[13px] text-[var(--primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100"
              onClick={() => setCreating(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
