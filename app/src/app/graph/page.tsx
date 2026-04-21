"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";
import { forceLayout, type LaidEdge, type LaidNode } from "@/components/editorial/map/force-layout";

interface GraphNode {
  id: string;
  slug: string;
  title: string;
  type: string;
  projectId: number;
  projectSlug: string;
}
interface GraphEdge {
  from: string;
  to: string;
  crossProject: boolean;
}

const WIDTH = 1000;
const HEIGHT = 640;

const TYPE_COLOR_VAR: Record<string, string> = {
  synthesis: "var(--accent)",
  concept: "var(--blue)",
  entity: "var(--amber)",
  source: "var(--ink)",
  comparison: "var(--green)",
  query: "var(--red)",
  output: "var(--accent)",
};

const TYPE_LABEL: Record<string, string> = {
  synthesis: "Synthesis",
  concept: "Concepts",
  entity: "Entities",
  source: "Sources",
  comparison: "Comparisons",
  query: "Queries",
  output: "Outputs",
};

function clusteringCoef(nodes: LaidNode[], edges: LaidEdge[]): number {
  if (nodes.length < 3) return 0;
  const nbrs = new Map<string, Set<string>>();
  for (const n of nodes) nbrs.set(n.id, new Set());
  for (const e of edges) {
    nbrs.get(e.from)?.add(e.to);
    nbrs.get(e.to)?.add(e.from);
  }
  let sum = 0;
  let counted = 0;
  for (const n of nodes) {
    const neigh = Array.from(nbrs.get(n.id) ?? []);
    if (neigh.length < 2) continue;
    let triangles = 0;
    for (let i = 0; i < neigh.length; i++) {
      for (let j = i + 1; j < neigh.length; j++) {
        if (nbrs.get(neigh[i])?.has(neigh[j])) triangles++;
      }
    }
    const possible = (neigh.length * (neigh.length - 1)) / 2;
    sum += triangles / possible;
    counted++;
  }
  return counted === 0 ? 0 : sum / counted;
}

export default function MapPage() {
  const router = useRouter();
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? null;

  const [rawNodes, setRawNodes] = useState<GraphNode[]>([]);
  const [rawEdges, setRawEdges] = useState<GraphEdge[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    fetch(`/api/wiki/graph?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
        if (!cancelled) {
          setRawNodes(d.nodes ?? []);
          setRawEdges(d.edges ?? []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const { nodes, edges } = useMemo(() => {
    if (rawNodes.length === 0) return { nodes: [] as LaidNode[], edges: [] as LaidEdge[] };
    return forceLayout({
      nodes: rawNodes.map((n) => ({ id: n.id, type: n.type, title: n.title, slug: n.slug })),
      edges: rawEdges,
      width: WIDTH,
      height: HEIGHT,
      iterations: 260,
    });
  }, [rawNodes, rawEdges]);

  const typeCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of nodes) c.set(n.type, (c.get(n.type) ?? 0) + 1);
    return c;
  }, [nodes]);

  const clustering = useMemo(() => clusteringCoef(nodes, edges), [nodes, edges]);

  // Identify hub (most-connected node) for the central pulse
  const hubId = useMemo(() => {
    const deg = new Map<string, number>();
    for (const e of edges) {
      deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
      deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
    }
    let best = "";
    let bestDeg = -1;
    for (const [k, v] of deg) {
      if (v > bestDeg) {
        bestDeg = v;
        best = k;
      }
    }
    return best || nodes[0]?.id || "";
  }, [edges, nodes]);

  const tooltipNode = hoverId ? nodes.find((n) => n.id === hoverId) : null;

  const onNodeClick = useCallback(
    (n: LaidNode) => {
      router.push(`/wiki?slug=${encodeURIComponent(n.slug)}`);
    },
    [router]
  );

  function edgeDim(e: LaidEdge): boolean {
    if (!activeType) return false;
    const a = nodes.find((n) => n.id === e.from);
    const b = nodes.find((n) => n.id === e.to);
    if (!a || !b) return true;
    return a.type !== activeType && b.type !== activeType;
  }

  function nodeDim(n: LaidNode): boolean {
    if (!activeType) return false;
    return n.type !== activeType;
  }

  // Build an SVG coordinate → screen coordinate mapper for the tooltip.
  // The SVG uses preserveAspectRatio="xMidYMid meet" inside a responsive
  // container; we read bbox on demand to position the tooltip over hover.
  const [svgRect, setSvgRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    function update() {
      if (svgRef.current) setSvgRect(svgRef.current.getBoundingClientRect());
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [nodes.length]);

  const tooltipPos = useMemo(() => {
    if (!tooltipNode || !svgRect) return null;
    const scale = Math.min(svgRect.width / WIDTH, svgRect.height / HEIGHT);
    const offsetX = (svgRect.width - WIDTH * scale) / 2;
    const offsetY = (svgRect.height - HEIGHT * scale) / 2;
    return {
      left: offsetX + tooltipNode.x * scale,
      top: offsetY + tooltipNode.y * scale,
    };
  }, [tooltipNode, svgRect]);

  return (
    <div className="pad">
      <EditorialBreadcrumbs tail="Map" />

      <div className="sec-head">
        <h1>
          The <em>Map.</em>
        </h1>
        <div className="rail-meta">
          <div>
            <b>{nodes.length}</b> nodes
          </div>
          <div>
            <b>{edges.length}</b> edges
          </div>
          <div>
            Clustering <b>{clustering.toFixed(2)}</b>
          </div>
          <div>Layout · Force-dir.</div>
        </div>
      </div>

      <div className="mapwrap">
        {rawNodes.length === 0 ? (
          <div className="map-empty">No pages yet — the map will populate as you ingest.</div>
        ) : (
          <>
            <svg
              ref={svgRef}
              viewBox={`${-pan.x} ${-pan.y} ${WIDTH / zoom} ${HEIGHT / zoom}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ cursor: dragging ? "grabbing" : "grab" }}
              onMouseDown={(e) => {
                setDragging(true);
                dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
              }}
              onMouseMove={(e) => {
                if (!dragging || !dragStart.current) return;
                const dx = e.clientX - dragStart.current.x;
                const dy = e.clientY - dragStart.current.y;
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect) return;
                const scale = WIDTH / zoom / rect.width;
                setPan({
                  x: dragStart.current.panX + dx * scale,
                  y: dragStart.current.panY + dy * scale,
                });
              }}
              onMouseUp={() => {
                setDragging(false);
                dragStart.current = null;
              }}
              onMouseLeave={() => {
                setDragging(false);
                dragStart.current = null;
              }}
              onWheel={(e) => {
                if (!e.ctrlKey && !e.metaKey) return;
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                setZoom((z) => Math.max(0.5, Math.min(4, z * delta)));
              }}
            >
              {/* edges */}
              {edges.map((e, i) => {
                const a = nodes.find((n) => n.id === e.from);
                const b = nodes.find((n) => n.id === e.to);
                if (!a || !b) return null;
                return (
                  <line
                    key={`e${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--ink)"
                    strokeWidth={e.crossProject ? 0.9 : 0.7}
                    strokeDasharray={e.crossProject ? "4 3" : undefined}
                    opacity={edgeDim(e) ? 0.06 : 0.55}
                    className={`map-edge${edgeDim(e) ? " dim" : ""}`}
                  />
                );
              })}

              {/* hub pulse */}
              {hubId && nodes.length > 0 && (() => {
                const hub = nodes.find((n) => n.id === hubId);
                if (!hub) return null;
                return (
                  <circle cx={hub.x} cy={hub.y} r={hub.r} fill="var(--accent)" opacity={0.5}>
                    <animate
                      attributeName="r"
                      from={hub.r}
                      to={hub.r * 3}
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })()}

              {/* nodes */}
              {nodes.map((n) => {
                const isHub = n.id === hubId;
                const fill = isHub ? "var(--accent)" : TYPE_COLOR_VAR[n.type] ?? "var(--ink)";
                return (
                  <g key={n.id}>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r}
                      fill={fill}
                      stroke="var(--paper)"
                      strokeWidth={1.5}
                      className={`map-node${nodeDim(n) ? " dim" : ""}`}
                      onMouseEnter={() => setHoverId(n.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={() => onNodeClick(n)}
                    />
                    {n.r >= 8 && (
                      <text
                        x={n.x}
                        y={n.y + n.r + 12}
                        textAnchor="middle"
                        fontFamily="var(--font-serif)"
                        fontSize={10.5}
                        fill="var(--ink-2)"
                        pointerEvents="none"
                      >
                        {n.title.length > 28 ? n.title.slice(0, 26) + "…" : n.title}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="map-controls">
              <button
                type="button"
                title="Zoom in"
                onClick={() => setZoom((z) => Math.min(4, z * 1.25))}
                disabled={zoom >= 4}
              >
                +
              </button>
              <button
                type="button"
                title="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.5, z * 0.8))}
                disabled={zoom <= 0.5}
              >
                −
              </button>
              <button
                type="button"
                title="Recenter"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                ⌖
              </button>
            </div>

            <div className={`map-overlay${activeType ? " active" : ""}`}>
              <h5>
                The <em>Map</em>
              </h5>
              <p>Hover a node for title. Click to open.</p>
              <div className="leg">
                {Array.from(typeCounts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([t, count]) => (
                    <button
                      key={t}
                      type="button"
                      className={`le${activeType === t ? " on" : ""}`}
                      onClick={() => setActiveType((prev) => (prev === t ? null : t))}
                    >
                      <span className="d" style={{ background: TYPE_COLOR_VAR[t] ?? "var(--ink)" }} />
                      <span>{TYPE_LABEL[t] ?? t}</span>
                      <span className="c">{count}</span>
                    </button>
                  ))}
              </div>
            </div>

            {tooltipNode && tooltipPos && (
              <div
                className="map-tooltip show"
                style={{ left: tooltipPos.left, top: tooltipPos.top }}
              >
                <span className="t">{tooltipNode.title}</span>
                <span className="sub">{tooltipNode.type}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
