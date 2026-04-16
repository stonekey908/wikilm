"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Share2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

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

// Deterministic layout: group by type, place each group on a ring segment
// so related nodes cluster visually. Not physics — but readable for 50+ nodes.
function computeLayout(
  nodes: GraphNode[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;

  // Group nodes by type
  const byType = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const list = byType.get(n.type) ?? [];
    list.push(n);
    byType.set(n.type, list);
  }

  // Sort types to keep layout stable across renders
  const types = Array.from(byType.keys()).sort();
  const totalNodes = nodes.length;
  let angleOffset = -Math.PI / 2; // start at top

  for (const type of types) {
    const group = byType.get(type)!;
    const share = group.length / totalNodes;
    const arcLength = share * Math.PI * 2;
    const step = arcLength / Math.max(group.length, 1);
    // Sort group by title so visual order is stable
    group.sort((a, b) => a.title.localeCompare(b.title));
    group.forEach((node, i) => {
      const angle = angleOffset + step * (i + 0.5);
      // Slight radial jitter by type to reduce overlap when groups are small
      const r = radius + ((type.charCodeAt(0) % 5) - 2) * 8;
      positions.set(node.slug, {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    });
    angleOffset += arcLength;
  }

  return positions;
}

export default function GraphPage() {
  const router = useRouter();
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
    fetch("/api/wiki/graph")
      .then((r) => r.json())
      .then((data: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    () => computeLayout(nodes, size.w, size.h),
    [nodes, size.w, size.h]
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
