"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Share2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useProject } from "@/components/project-switcher";
import { Breadcrumbs } from "@/components/breadcrumbs";

interface GraphNode {
  slug: string;
  title: string;
  type: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

// Type colors match wiki page TYPE_CONFIG
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
// by slug order) makes layout stable across reloads.
const MAX_ITER = 300;
const NODE_PAD = 12;

function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
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

  // Deterministic seed: ring by slug ordering — same nodes + edges produce
  // the same final layout on every reload.
  const seeded = new Map<
    string,
    { x: number; y: number; type: string }
  >();
  const initRadius = Math.min(width, height) * 0.3;
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    seeded.set(n.slug, {
      x: cx + initRadius * Math.cos(angle),
      y: cy + initRadius * Math.sin(angle),
      type: n.type,
    });
  });

  const slugs = nodes.map((n) => n.slug);
  let temperature = Math.min(width, height) * 0.1;
  const cooling = temperature / (MAX_ITER + 1);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();
    for (const s of slugs) forces.set(s, { fx: 0, fy: 0 });

    // Repulsive forces between every pair
    for (let i = 0; i < slugs.length; i++) {
      const a = seeded.get(slugs[i])!;
      for (let j = i + 1; j < slugs.length; j++) {
        const b = seeded.get(slugs[j])!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) continue; // degenerate pair — next iter will split
        // Same-type nodes repel ~15% less so they cluster gently by type
        const sameType = a.type === b.type ? 0.85 : 1;
        const mag = (kRep / dist) * sameType;
        const fx = (dx / dist) * mag;
        const fy = (dy / dist) * mag;
        const fa = forces.get(slugs[i])!;
        const fb = forces.get(slugs[j])!;
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
    for (const s of slugs) {
      const p = seeded.get(s)!;
      forces.get(s)!.fx -= (p.x - cx) * centerK;
      forces.get(s)!.fy -= (p.y - cy) * centerK;
    }

    // Apply capped displacement + clamp to canvas
    for (const s of slugs) {
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

  for (const [slug, p] of seeded) {
    positions.set(slug, { x: p.x, y: p.y });
  }
  return positions;
}

export default function GraphPage() {
  const router = useRouter();
  const { activeProject } = useProject();
  const activeProjectId = activeProject?.id ?? 1;
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  // Pan + zoom transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Canvas dimensions
  const [size, setSize] = useState({ w: 1000, h: 700 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/wiki/graph?projectId=${activeProjectId}`)
      .then((r) => r.json())
      .then((data: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeProjectId]);

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

  const positions = useMemo(
    () => computeLayout(nodes, edges, size.w, size.h),
    [nodes, edges, size.w, size.h]
  );

  // Highlighted set: the hovered node + its neighbors
  const highlightedSlugs = useMemo(() => {
    if (!hoveredSlug) return new Set<string>();
    const set = new Set<string>([hoveredSlug]);
    for (const e of edges) {
      if (e.from === hoveredSlug) set.add(e.to);
      if (e.to === hoveredSlug) set.add(e.from);
    }
    return set;
  }, [hoveredSlug, edges]);

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

  const nodeRadius = 6;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-6 pb-3 border-b border-[var(--border)] flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs project={activeProject} />
          <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
            Graph
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-1">
            {loading
              ? "Loading..."
              : `${nodes.length} nodes, ${edges.length} connections`}
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
                  hoveredSlug &&
                  (e.from === hoveredSlug || e.to === hoveredSlug);
                const isDimmed = hoveredSlug && !isHighlighted;
                return (
                  <line
                    key={`${e.from}->${e.to}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isHighlighted ? "var(--primary)" : "var(--border-strong)"}
                    strokeWidth={isHighlighted ? 1.5 : 0.8}
                    opacity={isDimmed ? 0.1 : isHighlighted ? 0.8 : 0.35}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((n) => {
                const p = positions.get(n.slug);
                if (!p) return null;
                const color = TYPE_COLORS[n.type] ?? TYPE_COLORS.unknown;
                const isHovered = hoveredSlug === n.slug;
                const isHighlighted = highlightedSlugs.has(n.slug);
                const isDimmed = hoveredSlug && !isHighlighted;
                return (
                  <g
                    key={n.slug}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredSlug(n.slug)}
                    onMouseLeave={() => setHoveredSlug(null)}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      router.push(`/wiki?slug=${encodeURIComponent(n.slug)}`);
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

            {/* Legend (fixed, not affected by pan/zoom) */}
            <g transform={`translate(16, ${size.h - 16 - Object.keys(TYPE_COLORS).length * 18})`}>
              {Object.entries(TYPE_COLORS)
                .filter(([type]) => nodes.some((n) => n.type === type))
                .map(([type, color], i) => (
                  <g key={type} transform={`translate(0, ${i * 18})`}>
                    <circle cx={6} cy={6} r={5} fill={color} />
                    <text
                      x={18}
                      y={10}
                      style={{
                        fontSize: "11px",
                        fill: "var(--text-3)",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {type}
                    </text>
                  </g>
                ))}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
