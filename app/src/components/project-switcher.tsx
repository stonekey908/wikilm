"use client";

import { useState, useRef, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

interface Project {
  id: number;
  name: string;
  slug: string;
  color: string;
  sourceCount: number;
  pageCount: number;
  parentId: number | null;
}

interface TreeNode {
  id: number;
  name: string;
  slug: string;
  color: string;
  parentId: number | null;
  children: TreeNode[];
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

const COLLAPSED_KEY = "wikilm-project-tree-collapsed";

/** Read the set of collapsed node ids from localStorage. Safe on server. */
function readCollapsed(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "number"));
  } catch {
    return new Set();
  }
}

function writeCollapsed(set: Set<number>) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // storage quota or private mode — silently skip
  }
}

/** Walk the tree and return the ancestors of a given project id (exclusive). */
function ancestorsOf(tree: TreeNode[], id: number): number[] {
  const path: number[] = [];
  function walk(nodes: TreeNode[], trail: number[]): boolean {
    for (const n of nodes) {
      if (n.id === id) {
        path.push(...trail);
        return true;
      }
      if (walk(n.children, [...trail, n.id])) return true;
    }
    return false;
  }
  walk(tree, []);
  return path;
}

export function ProjectSwitcher() {
  const { activeProject, projects, setActiveProject, refreshProjects } = useProject();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => readCollapsed());
  const ref = useRef<HTMLDivElement>(null);

  // Fetch the tree. Refetches whenever the flat projects list changes so
  // creates/deletes flow through.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects/tree")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTree(d.tree ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projects]);

  // Effective "collapsed" set — start from persisted `collapsed` and force
  // ancestors of the active project open so the active node stays visible.
  // The forced-open state is not persisted; user's explicit collapses stick.
  const effectiveCollapsed = useMemo(() => {
    if (!activeProject) return collapsed;
    const ancestors = ancestorsOf(tree, activeProject.id);
    if (ancestors.length === 0) return collapsed;
    const next = new Set(collapsed);
    let changed = false;
    for (const id of ancestors) {
      if (next.has(id)) {
        next.delete(id);
        changed = true;
      }
    }
    return changed ? next : collapsed;
  }, [tree, activeProject, collapsed]);

  function toggleCollapsed(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeCollapsed(next);
      return next;
    });
  }

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

  async function handleDelete(project: { id: number; name: string }, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete project "${project.name}" and all its data? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) {
        refreshProjects();
        if (activeProject?.id === project.id) {
          // Switch to another project or null
          const remaining = projects.filter((p) => p.id !== project.id);
          if (remaining.length > 0) setActiveProject(remaining[0]);
        }
      }
    } catch {
      // silently fail
    }
  }

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

  function renderNode(node: TreeNode, level: number): React.ReactNode {
    const hasChildren = node.children.length > 0;
    const isCollapsed = effectiveCollapsed.has(node.id);
    const isActive = activeProject?.id === node.id;
    const projectForClick = projects.find((p) => p.id === node.id);

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2.5 py-2 rounded-md text-[13px] transition-colors duration-100 group ${
            isActive
              ? "bg-[var(--primary-dim)] text-[var(--primary)] font-[550]"
              : "text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
          }`}
          style={{ paddingLeft: `${level * 12 + 10}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapsed(node.id);
              }}
              className="shrink-0 p-0.5 -ml-0.5 text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => {
              if (projectForClick) {
                setActiveProject(projectForClick);
                setOpen(false);
              }
            }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{ background: node.color }}
            />
            <span className="truncate text-left flex-1">{node.name}</span>
          </button>
          <button
            onClick={(e) => handleDelete({ id: node.id, name: node.name }, e)}
            className="opacity-0 group-hover:opacity-100 text-[var(--text-4)] hover:text-[var(--red)] transition-all shrink-0 p-0.5"
            title="Delete project"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        {hasChildren && !isCollapsed && (
          <div>{node.children.map((c) => renderNode(c, level + 1))}</div>
        )}
      </div>
    );
  }

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
        <div className="absolute top-full left-2.5 w-[240px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] z-50 p-1 mt-1 max-h-[60vh] overflow-y-auto">
          {tree.map((node) => renderNode(node, 0))}

          {tree.length > 0 && <div className="h-px bg-[var(--border)] my-1" />}

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
