"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/components/project-switcher";

interface TreeNode {
  id: number;
  name: string;
  slug: string;
  color: string;
  parentId: number | null;
  children: TreeNode[];
}

const COLLAPSED_KEY = "wikilm-project-tree-collapsed";

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
  } catch {}
}

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

const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 4l4 4-4 4" />
  </svg>
);

export function EditorialProjectTree() {
  const { activeProject, projects, setActiveProject } = useProject();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => readCollapsed());

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

  useEffect(() => {
    if (!activeProject) return;
    const ancestors = ancestorsOf(tree, activeProject.id);
    if (ancestors.length === 0) return;
    setCollapsed((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ancestors) {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      if (!changed) return prev;
      writeCollapsed(next);
      return next;
    });
  }, [activeProject?.id, tree]);

  function toggleCollapsed(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeCollapsed(next);
      return next;
    });
  }

  function activate(id: number) {
    const p = projects.find((x) => x.id === id);
    if (p) setActiveProject(p);
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    const isActive = activeProject?.id === node.id;
    const count = projects.find((p) => p.id === node.id)?.pageCount ?? 0;

    return (
      <div key={node.id}>
        <button
          type="button"
          className={`proj${isActive ? " active" : ""}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => activate(node.id)}
        >
          {hasChildren ? (
            <span
              className={`proj-chev${isCollapsed ? "" : " open"}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapsed(node.id);
              }}
              aria-hidden
            >
              <Chevron />
            </span>
          ) : (
            <span className="proj-spacer" />
          )}
          <span className="dot" style={{ background: node.color }}></span>
          <span className="t">{node.name}</span>
          {count > 0 && <span className="c">{count}</span>}
        </button>
        {hasChildren && !isCollapsed && (
          <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div
        style={{
          padding: "10px 12px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
        }}
      >
        No projects yet
      </div>
    );
  }

  return <div>{tree.map((n) => renderNode(n, 0))}</div>;
}
