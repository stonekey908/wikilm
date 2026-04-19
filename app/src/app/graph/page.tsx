"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Share2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useProject } from "@/components/project-switcher";
import { Breadcrumbs } from "@/components/breadcrumbs";

interface GraphNode {
  id: string;
  slug: string;
  title: string;
  type: string;
  projectId: number;
  projectSlug: string;
}

interface GraphEdge {
  from: string; // node id
  to: string; // node id
  crossProject: boolean;
}

type Scope = "project" | "subtree";

// Type colors match wiki page TYPE_CONFIG — used in "This project" scope
// where every node shares a project, so the type palette communicates more.
const TYPE_COLORS: Record<string, string> = {
  source: "var(--blue)",
  entity: "var(--orange)",
  concept: "var(--primary)",
  comparison: "var(--chart-3)",
  synthesis: "var(--chart-4)",
  query: "var(--green)",
  index: "var(--text-3)",
  unknown: "var(--text-4)",
};

// Force-directed layout (Fruchterman-Reingold-ish):
//   - all nodes repel each other (Coulomb-like)
//   - edges attract their endpoints (Hooke-like)
//   - small gravity toward center keeps the graph on screen
//   - same-type repulsion is mildly dampened → soft clusters by type
// Simulation runs synchronously in a useMemo up to MAX_ITER steps with a
// cooling schedule; final positions are static. Deterministic seed (ring
// by id order) makes layout stable across reloads.
const MAX_ITER = 300;
const NODE_PAD = 12;

function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  clusterKey: (n: GraphNode) => string
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const cx = width / 2;
  const cy = height / 2;
  const area = width * height;
  // Ideal edge length: spreads nodes to fill the canvas roughly evenly.
  const k = Math.sqrt(area / nodes.length) * 0.85;
  const kRep = k * k;
  const kAttrInv = 1 / k;

  // Deterministic seed: ring by id ordering — same nodes + edges produce
  // the same final layout on every reload.
  const seeded = new Map<
    string,
    { x: number; y: number; cluster: string }
  >();
  const initRadius = Math.min(width, height) * 0.3;
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    seeded.set(n.id, {
      x: cx + initRadius * Math.cos(angle),
      y: cy + initRadius * Math.sin(angle),
      cluster: clusterKey(n),
    });
  });

  const ids = nodes.map((n) => n.id);
  let temperature = Math.min(width, height) * 0.1;
  const cooling = temperature / (MAX_ITER + 1);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();
    for (const s of ids) forces.set(s, { fx: 0, fy: 0 });

    // Repulsive forces between every pair
    for (let i = 0; i < ids.length; i++) {
      const a = seeded.get(ids[i])!;
      for (let j = i + 1; j < ids.length; j++) {
        const b = seeded.get(ids[j])!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) continue; // degenerate pair — next iter will split
        // Same-cluster nodes repel ~15% less so they cluster gently.
        const sameCluster = a.cluster === b.cluster ? 0.85 : 1;
        const mag = (kRep / dist) * sameCluster;
        const fx = (dx / dist) * mag;
        const fy = (dy / dist) * mag;
        const fa = forces.get(ids[i])!;
        const fb = forces.get(ids[j])!;
        fa.fx += fx;
        fa.fy += fy;
        fb.fx -= fx;
        fb.fy -= fy;
      }
    }

    // Attractive forces along edges
    for (const e of edges) {
      const a = seeded.get(e.from);
      const b = seeded.get(e.to);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const mag = dist * dist * kAttrInv;
      const fx = (dx / dist) * mag;
      const fy = (dy / dist) * mag;
      forces.get(e.from)!.fx -= fx;
      forces.get(e.from)!.fy -= fy;
      forces.get(e.to)!.fx += fx;
      forces.get(e.to)!.fy += fy;
    }

    // Weak center gravity so isolated clusters don't drift off-screen
    const centerK = 0.015;
    for (const s of ids) {
      const p = seeded.get(s)!;
      forces.get(s)!.fx -= (p.x - cx) * centerK;
      forces.get(s)!.fy -= (p.y - cy) * centerK;
    }

    // Apply capped displacement + clamp to canvas
    for (const s of ids) {
      const p = seeded.get(s)!;
      const f = forces.get(s)!;
      const fmag = Math.hypot(f.fx, f.fy) || 1;
      const capped = Math.min(fmag, temperature);
      p.x += (f.fx / fmag) * capped;
      p.y += (f.fy / fmag) * capped;
      p.x = Math.max(NODE_PAD, Math.min(width - NODE_PAD, p.x));
      p.y = Math.max(NODE_PAD, Math.min(height - NODE_PAD, p.y));
    }

    temperature = Math.max(0.1, temperature - cooling);
  }

  for (const [id, p] of seeded) {
    positions.set(id, { x: p.x, y: p.y });
  }
  return positions;
}

export default function GraphPage() {
  const router = useRouter();
  const { activeProject, projects, setActiveProject } = useProject();
  const activeProjectId = activeProject?.id ?? 1;
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("project");

  // Pan + zoom transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Canvas dimensions
  const [size, setSize] = useState({ w: 1000, h: 700 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Does the active project have any children? Controls whether we show the
  // scope toggle at all (flat projects don't need it).
  const hasChildren = useMemo(
    () => projects.some((p) => p.parentId === activeProjectId),
    [projects, activeProjectId]
  );

  // Coerce to "project" whenever the active project has no children — the
  // toggle is hidden in that case, so an orphaned "subtree" selection (e.g.
  // user toggled on a nested project, then switched to a flat one) would
  // otherwise send a bogus scope param. Derived, not a post-render effect.
  const effectiveScope: Scope = hasChildren ? scope : "project";

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/wiki/graph?projectId=${activeProjectId}&scope=${effectiveScope}`)
      .then((r) => r.json())
      .then((data: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
        if (cancelled) return;
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, effectiveScope]);

  // Observe container size so layout adapts
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Map projectId -> color lookup for subtree-mode node coloring and legend.
  // In subtree mode, prefer a deterministic distinct palette over the user's
  // picked colors so clusters stay visually separable even when two projects
  // happen to share the default teal. Projects beyond the palette fall back
  // to their own color.
  const SUBTREE_PALETTE = useMemo(
    () => [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
      "#f59e0b", // amber
      "#ec4899", // pink
      "#14b8a6", // teal
    ],
    []
  );
  const projectColor = useMemo(() => {
    const m = new Map<number, string>();
    if (effectiveScope === "subtree") {
      // Deterministic ordering: by project id so assignment is stable.
      const ordered = [...projects].sort((a, b) => a.id - b.id);
      ordered.forEach((p, i) => {
        m.set(p.id, SUBTREE_PALETTE[i % SUBTREE_PALETTE.length]);
      });
    } else {
      for (const p of projects) m.set(p.id, p.color);
    }
    return m;
  }, [projects, effectiveScope, SUBTREE_PALETTE]);

  const projectName = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  // In subtree mode, cluster by project (so same-project nodes attract); in
  // project mode, cluster by type (preserves the existing behavior).
  const clusterKey = useMemo(
    () =>
      effectiveScope === "subtree"
        ? (n: GraphNode) => String(n.projectId)
        : (n: GraphNode) => n.type,
    [effectiveScope]
  );

  const positions = useMemo(
    () => computeLayout(nodes, edges, size.w, size.h, clusterKey),
    [nodes, edges, size.w, size.h, clusterKey]
  );

  // Which projects actually have nodes in the current graph? Drives the
  // per-project legend in subtree mode.
  const visibleProjectIds = useMemo(() => {
    const seen = new Set<number>();
    for (const n of nodes) seen.add(n.projectId);
    return Array.from(seen);
  }, [nodes]);

  // Highlighted set: the hovered node + its neighbors
  const highlightedIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>([hoveredId]);
    for (const e of edges) {
      if (e.from === hoveredId) set.add(e.to);
      if (e.to === hoveredId) set.add(e.from);
    }
    return set;
  }, [hoveredId, edges]);

  function handleMouseDown(e: React.MouseEvent) {
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!panRef.current) return;
    setPan({
      x: panRef.current.panX + (e.clientX - panRef.current.startX),
      y: panRef.current.panY + (e.clientY - panRef.current.startY),
    });
  }
  function handleMouseUp() {
    panRef.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    const delta = -e.deltaY * 0.001;
    setZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
  }

  function resetView() {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }

  // Navigate into the wiki for a given node. In subtree mode the clicked
  // node may belong to a descendant project — flip the active project first
  // so /wiki opens in the right context.
  function navigateToNode(n: GraphNode) {
    if (n.projectId !== activeProjectId) {
      const destProject = projects.find((p) => p.id === n.projectId);
      if (destProject) setActiveProject(destProject);
    }
    router.push(`/wiki?slug=${encodeURIComponent(n.slug)}`);
  }

  function colorForNode(n: GraphNode): string {
    if (effectiveScope === "subtree") {
      return projectColor.get(n.projectId) ?? TYPE_COLORS.unknown;
    }
    return TYPE_COLORS[n.type] ?? TYPE_COLORS.unknown;
  }

  const nodeRadius = 6;
  // In project mode the legend maps type -> color. In subtree mode it maps
  // project -> color; cross-project edges get a second swatch below.
  const legendEntries: { key: string; color: string; label: string }[] =
    effectiveScope === "subtree"
      ? visibleProjectIds.map((id) => ({
          key: `proj-${id}`,
          color: projectColor.get(id) ?? TYPE_COLORS.unknown,
          label: projectName.get(id) ?? `project ${id}`,
        }))
      : Object.entries(TYPE_COLORS)
          .filter(([type]) => nodes.some((n) => n.type === type))
          .map(([type, color]) => ({ key: type, color, label: type }));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-6 pb-3 border-b border-[var(--border)] flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Breadcrumbs project={activeProject} />
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
              Graph
            </h1>
            {hasChildren && (
              <div
                className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-1)] p-0.5 text-[12px]"
                role="tablist"
                aria-label="Graph scope"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === "project"}
                  onClick={() => setScope("project")}
                  className={`px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                    scope === "project"
                      ? "bg-[var(--bg-2)] text-[var(--text-1)] font-[550]"
                      : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                  }`}
                >
                  This project
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === "subtree"}
                  onClick={() => setScope("subtree")}
                  className={`px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                    scope === "subtree"
                      ? "bg-[var(--bg-2)] text-[var(--text-1)] font-[550]"
                      : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                  }`}
                >
                  Whole subtree
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-[var(--text-3)] mt-1">
            {loading
              ? "Loading..."
              : `${nodes.length} nodes, ${edges.length} connections${
                  effectiveScope === "subtree" && visibleProjectIds.length > 1
                    ? ` · ${visibleProjectIds.length} projects`
                    : ""
                }`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-2 rounded-md border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)] transition-all cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="p-2 rounded-md border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)] transition-all cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-md border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)] transition-all cursor-pointer"
            title="Reset view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-[var(--bg-0)] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-3)]">
            Building graph...
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ backgroundColor: "var(--primary-dim)" }}
            >
              <Share2 className="w-7 h-7" style={{ color: "var(--primary)" }} />
            </div>
            <h2 className="text-[15px] font-[600] text-[var(--text-1)] mb-1.5">
              No pages yet
            </h2>
            <p className="text-[13px] text-[var(--text-3)] max-w-sm text-center">
              Add sources and ingest them — the graph will populate as pages and
              connections are created.
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={size.w}
            height={size.h}
            className="absolute inset-0"
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.map((e) => {
                const from = positions.get(e.from);
                const to = positions.get(e.to);
                if (!from || !to) return null;
                const isHighlighted =
                  hoveredId && (e.from === hoveredId || e.to === hoveredId);
                const isDimmed = hoveredId && !isHighlighted;
                // Cross-project edges in subtree mode: thicker + accent color
                // so the bridges between clusters pop. In project scope this
                // never applies because every edge is same-project.
                const baseWidth = e.crossProject ? 1.6 : 0.8;
                const highlightWidth = e.crossProject ? 2.4 : 1.5;
                const baseStroke = e.crossProject
                  ? "var(--primary)"
                  : "var(--border-strong)";
                const highlightStroke = "var(--primary)";
                return (
                  <line
                    key={`${e.from}->${e.to}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isHighlighted ? highlightStroke : baseStroke}
                    strokeWidth={isHighlighted ? highlightWidth : baseWidth}
                    opacity={
                      isDimmed
                        ? 0.1
                        : isHighlighted
                          ? 0.85
                          : e.crossProject
                            ? 0.6
                            : 0.35
                    }
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((n) => {
                const p = positions.get(n.id);
                if (!p) return null;
                const color = colorForNode(n);
                const isHovered = hoveredId === n.id;
                const isHighlighted = highlightedIds.has(n.id);
                const isDimmed = hoveredId && !isHighlighted;
                return (
                  <g
                    key={n.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      navigateToNode(n);
                    }}
                    style={{ opacity: isDimmed ? 0.2 : 1 }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? nodeRadius + 2 : nodeRadius}
                      fill={color}
                      stroke={isHovered ? "var(--text-1)" : "var(--bg-0)"}
                      strokeWidth={isHovered ? 2 : 1.5}
                    />
                    {(isHovered || zoom > 1.2) && (
                      <text
                        x={p.x}
                        y={p.y - nodeRadius - 6}
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                        style={{
                          fontSize: `${Math.max(10, 11 / zoom)}px`,
                          fill: "var(--text-1)",
                          fontWeight: isHovered ? 600 : 500,
                          paintOrder: "stroke",
                          stroke: "var(--bg-0)",
                          strokeWidth: 3,
                        }}
                      >
                        {n.title.length > 30 ? n.title.slice(0, 30) + "…" : n.title}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Legend (fixed, not affected by pan/zoom). Includes a
                "cross-project" row at the bottom when subtree mode has
                multiple projects visible. */}
            {(() => {
              const showCrossProjectSwatch =
                effectiveScope === "subtree" && visibleProjectIds.length > 1;
              const rowCount =
                legendEntries.length + (showCrossProjectSwatch ? 1 : 0);
              if (rowCount === 0) return null;
              const rowHeight = 18;
              const y = size.h - 16 - rowCount * rowHeight;
              return (
                <g transform={`translate(16, ${y})`}>
                  {legendEntries.map((entry, i) => (
                    <g key={entry.key} transform={`translate(0, ${i * rowHeight})`}>
                      <circle cx={6} cy={6} r={5} fill={entry.color} />
                      <text
                        x={18}
                        y={10}
                        style={{
                          fontSize: "11px",
                          fill: "var(--text-3)",
                          fontWeight: 500,
                          textTransform:
                            effectiveScope === "subtree" ? "none" : "capitalize",
                        }}
                      >
                        {entry.label}
                      </text>
                    </g>
                  ))}
                  {showCrossProjectSwatch && (
                    <g
                      transform={`translate(0, ${legendEntries.length * rowHeight})`}
                    >
                      <line
                        x1={1}
                        y1={6}
                        x2={11}
                        y2={6}
                        stroke="var(--primary)"
                        strokeWidth={1.8}
                      />
                      <text
                        x={18}
                        y={10}
                        style={{
                          fontSize: "11px",
                          fill: "var(--text-3)",
                          fontWeight: 500,
                        }}
                      >
                        cross-project link
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
}
