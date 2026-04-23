"use client";

import { useEffect, useRef, useState } from "react";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { PortalToBody } from "@/components/editorial/portal-to-body";

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

function subtreeIds(tree: TreeNode[], id: number): Set<number> {
  const result = new Set<number>();
  function findAndCollect(nodes: TreeNode[]): TreeNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const hit = findAndCollect(n.children);
      if (hit) return hit;
    }
    return null;
  }
  const root = findAndCollect(tree);
  if (!root) return result;
  function collect(n: TreeNode) {
    result.add(n.id);
    n.children.forEach(collect);
  }
  collect(root);
  return result;
}

function flattenTree(tree: TreeNode[]): { node: TreeNode; depth: number }[] {
  const out: { node: TreeNode; depth: number }[] = [];
  function walk(nodes: TreeNode[], depth: number) {
    for (const n of nodes) {
      out.push({ node: n, depth });
      if (n.children.length) walk(n.children, depth + 1);
    }
  }
  walk(tree, 0);
  return out;
}

const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 4l4 4-4 4" />
  </svg>
);

export function EditorialProjectTree() {
  const { activeProject, projects, setActiveProject, refreshProjects } = useProject();
  const { addToast } = useToast();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => readCollapsed());
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [addingUnder, setAddingUnder] = useState<number | "root" | null>(null);
  const [newName, setNewName] = useState("");
  const [moveTarget, setMoveTarget] = useState<TreeNode | null>(null);
  const [moveNewParentId, setMoveNewParentId] = useState<number | null>(null);
  const [moveBusy, setMoveBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (menuFor === null) return;
    // Close only when the click/mousedown lands outside the open menu. The
    // earlier version relied on stopPropagation in the menu's onMouseDown to
    // block this listener, which was fragile — any missed stop (e.g. a
    // button's mousedown path through a portal or zoomed ancestor) would
    // reset menuFor before the button's click handler could run, so Move /
    // Delete appeared inert.
    let cancelled = false;
    function onDoc(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuFor(null);
    }
    const timer = window.setTimeout(() => {
      if (!cancelled) document.addEventListener("mousedown", onDoc);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [menuFor]);

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

  async function createProject(parentId: number | null) {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId }),
      });
      if (!res.ok) throw new Error();
      const p = await res.json();
      setActiveProject(p);
      refreshProjects();
      addToast({ type: "success", title: `Created · ${name}` });
    } catch {
      addToast({ type: "error", title: "Couldn't create project" });
    } finally {
      setNewName("");
      setAddingUnder(null);
    }
  }

  async function deleteProject(id: number, name: string) {
    if (!confirm(`Delete project "${name}" and all its wiki + sources? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        // Surface the server's actual error — parent projects with children
        // return 409 with a descriptive message that the user needs to see.
        let detail = "Couldn't delete project";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) detail = body.error;
        } catch {}
        addToast({ type: "error", title: detail });
        return;
      }
      addToast({ type: "success", title: `Deleted · ${name}` });
      refreshProjects();
    } catch {
      addToast({ type: "error", title: "Couldn't delete project" });
    } finally {
      setMenuFor(null);
    }
  }

  async function handleMove() {
    if (!moveTarget) return;
    setMoveBusy(true);
    try {
      const res = await fetch(`/api/projects/${moveTarget.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newParentId: moveNewParentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "move failed");
      }
      addToast({ type: "success", title: "Moved" });
      refreshProjects();
      setMoveTarget(null);
      setMoveNewParentId(null);
    } catch (err: unknown) {
      addToast({ type: "error", title: err instanceof Error ? err.message : "Couldn't move" });
    } finally {
      setMoveBusy(false);
    }
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    const isActive = activeProject?.id === node.id;
    const count = projects.find((p) => p.id === node.id)?.pageCount ?? 0;
    const menuOpen = menuFor === node.id;
    const isAddingHere = addingUnder === node.id;

    return (
      <div key={node.id} style={{ position: "relative" }}>
        <div className={`proj${isActive ? " active" : ""}`} style={{ paddingLeft: `${depth * 12 + 8}px` }}>
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
          <span className="t" onClick={() => activate(node.id)} style={{ cursor: "pointer" }}>
            {node.name}
          </span>
          {count > 0 && (
            <span className="c" onClick={() => activate(node.id)} style={{ cursor: "pointer" }}>
              {count}
            </span>
          )}
          {node.id !== 1 && (
            <button
              className="proj-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuFor((v) => (v === node.id ? null : node.id));
              }}
              aria-label="Project actions"
            >
              ⋯
            </button>
          )}
        </div>

        {menuOpen && (
          <div
            ref={menuRef}
            className="proj-menu"
            style={{ top: 28, right: 6 }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setAddingUnder(node.id);
                setNewName("");
                setMenuFor(null);
              }}
            >
              Add child
            </button>
            <button
              onClick={() => {
                setMoveTarget(node);
                setMoveNewParentId(node.parentId ?? null);
                setMenuFor(null);
              }}
            >
              Move
            </button>
            <button className="danger" onClick={() => deleteProject(node.id, node.name)}>
              Delete
            </button>
          </div>
        )}

        {isAddingHere && (
          <div className="proj-add-form">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Child project name"
              onKeyDown={(e) => {
                if (e.key === "Enter") createProject(node.id);
                if (e.key === "Escape") {
                  setAddingUnder(null);
                  setNewName("");
                }
              }}
            />
            <div className="actions">
              <button onClick={() => setAddingUnder(null)}>Cancel</button>
              <button className="primary" onClick={() => createProject(node.id)} disabled={!newName.trim()}>
                Create
              </button>
            </div>
          </div>
        )}

        {hasChildren && !isCollapsed && <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>}
      </div>
    );
  }

  const movePlaces = moveTarget
    ? (() => {
        const blocked = subtreeIds(tree, moveTarget.id);
        return flattenTree(tree).filter(({ node }) => !blocked.has(node.id));
      })()
    : [];

  return (
    <div>
      {tree.length === 0 ? (
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
      ) : (
        tree.map((n) => renderNode(n, 0))
      )}

      {addingUnder === "root" ? (
        <div className="proj-add-form">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New project name"
            onKeyDown={(e) => {
              if (e.key === "Enter") createProject(null);
              if (e.key === "Escape") {
                setAddingUnder(null);
                setNewName("");
              }
            }}
          />
          <div className="actions">
            <button onClick={() => setAddingUnder(null)}>Cancel</button>
            <button className="primary" onClick={() => createProject(null)} disabled={!newName.trim()}>
              Create
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAddingUnder("root");
            setNewName("");
          }}
          style={{
            margin: "6px 8px 4px",
            padding: "6px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            background: "none",
            border: "1px dashed var(--rule-faint)",
            cursor: "pointer",
            width: "calc(100% - 16px)",
            textAlign: "left",
          }}
        >
          + New project
        </button>
      )}

      {moveTarget && (
        <PortalToBody>
        <div className="proj-move-modal" onClick={() => !moveBusy && setMoveTarget(null)}>
          <div className="proj-move-card" onClick={(e) => e.stopPropagation()}>
            <h3>
              Move <em>{moveTarget.name}</em>
            </h3>
            <div className="proj-move-list">
              <button className={moveNewParentId === null ? "on" : ""} onClick={() => setMoveNewParentId(null)}>
                <em style={{ fontFamily: "var(--font-inst)", color: "var(--accent)" }}>Detach to root</em>
              </button>
              {movePlaces.map(({ node, depth }) => (
                <button
                  key={node.id}
                  className={moveNewParentId === node.id ? "on" : ""}
                  style={{ paddingLeft: depth * 14 + 10 }}
                  onClick={() => setMoveNewParentId(node.id)}
                >
                  <span>{node.name}</span>
                  <span className="slug">{node.slug}</span>
                </button>
              ))}
            </div>
            <div className="foot">
              <button className="btn ghost" onClick={() => setMoveTarget(null)} disabled={moveBusy}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleMove} disabled={moveBusy}>
                {moveBusy ? "Moving…" : "Move"}
              </button>
            </div>
          </div>
        </div>
        </PortalToBody>
      )}
    </div>
  );
}
