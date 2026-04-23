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

const BASE_WIDTH = 1000;
const BASE_HEIGHT = 640;

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

/**
 * For each node, the set of directly-connected neighbours (either direction).
 * Used for 1-hop neighborhood highlighting + orphan / hub / bridge detection.
 */
function buildAdjacency(nodes: LaidNode[], edges: LaidEdge[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const n of nodes) map.set(n.id, new Set());
  for (const e of edges) {
    map.get(e.from)?.add(e.to);
    map.get(e.to)?.add(e.from);
  }
  return map;
}

/**
 * Nodes with zero inbound AND zero outbound edges — the wiki's "dead ends"
 * the gist cares about. Structural affordance so you can spot them without
 * running lint.
 */
function findOrphans(nodes: LaidNode[], adj: Map<string, Set<string>>): Set<string> {
  const out = new Set<string>();
  for (const n of nodes) {
    if ((adj.get(n.id)?.size ?? 0) === 0) out.add(n.id);
  }
  return out;
}

/**
 * Top-10% of nodes by total degree — the "gravity wells" of the graph.
 * These are where knowledge compounds fastest.
 */
function findHubs(nodes: LaidNode[], adj: Map<string, Set<string>>): Set<string> {
  if (nodes.length === 0) return new Set();
  const degrees = nodes.map((n) => ({ id: n.id, d: adj.get(n.id)?.size ?? 0 }));
  degrees.sort((a, b) => b.d - a.d);
  const topCount = Math.max(1, Math.ceil(nodes.length * 0.1));
  const threshold = degrees[topCount - 1]?.d ?? 0;
  if (threshold < 2) return new Set(); // don't crown nodes with 0-1 links
  const out = new Set<string>();
  for (const d of degrees) {
    if (d.d >= threshold) out.add(d.id);
  }
  return out;
}

/**
 * Approximate betweenness — nodes that sit on many shortest paths between
 * otherwise-disconnected clusters. O(V * (V + E)) BFS from each source so
 * we cap it at 500 nodes; larger graphs skip this marker.
 *
 * Top-5% by betweenness are treated as bridges.
 */
function findBridges(nodes: LaidNode[], adj: Map<string, Set<string>>): Set<string> {
  const out = new Set<string>();
  if (nodes.length === 0 || nodes.length > 500) return out;
  const betweenness = new Map<string, number>();
  for (const n of nodes) betweenness.set(n.id, 0);

  for (const source of nodes) {
    // BFS from source, count the shortest paths passing through each node.
    const dist = new Map<string, number>();
    const prevs = new Map<string, string[]>();
    const queue: string[] = [source.id];
    dist.set(source.id, 0);
    while (queue.length) {
      const u = queue.shift()!;
      for (const v of adj.get(u) ?? []) {
        if (!dist.has(v)) {
          dist.set(v, (dist.get(u) ?? 0) + 1);
          prevs.set(v, [u]);
          queue.push(v);
        } else if ((dist.get(v) ?? 0) === (dist.get(u) ?? 0) + 1) {
          prevs.get(v)?.push(u);
        }
      }
    }
    // Credit nodes on the shortest paths.
    for (const [target] of dist) {
      if (target === source.id) continue;
      let cur: string | null = target;
      while (cur && cur !== source.id) {
        betweenness.set(cur, (betweenness.get(cur) ?? 0) + 1);
        cur = prevs.get(cur)?.[0] ?? null;
      }
    }
  }

  const sorted = Array.from(betweenness.entries()).sort((a, b) => b[1] - a[1]);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.05));
  const threshold = sorted[topCount - 1]?.[1] ?? 0;
  if (threshold < 2) return out;
  for (const [id, v] of sorted) {
    if (v >= threshold) out.add(id);
  }
  return out;
}

/**
 * Extract the first useful paragraph from a markdown body — skip frontmatter
 * (already removed server-side), skip the title heading, skip empty lines and
 * bullet lists, flatten wikilinks to their display form.
 */
function extractExcerpt(body: string): string {
  const lines = body.split("\n");
  const buf: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (buf.length) break;
      continue;
    }
    if (trimmed.startsWith("#")) continue; // skip all headings
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) continue;
    if (trimmed.startsWith(">")) continue;
    buf.push(trimmed);
    if (buf.join(" ").length > 220) break;
  }
  const raw = buf.join(" ");
  const flattened = raw.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
  return flattened.length > 260 ? flattened.slice(0, 258).trimEnd() + "…" : flattened;
}

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

/**
 * Shown when constellation view is on but the project has no synthesis
 * pages to anchor the view. Surfaces the gap (no silent fallback to full
 * graph) and offers a one-click trigger for the synthesis job.
 */
function ConstellationEmpty({
  projectId,
  onSwitchToFull,
}: {
  projectId: number | null;
  onSwitchToFull: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fire = useCallback(async () => {
    if (projectId === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/synthesis/run`, { method: "POST" });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      setQueued(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [projectId, busy]);
  return (
    <div className="map-empty constellation-empty">
      <div className="ce-eyebrow">Constellation view</div>
      <h3>No synthesis page yet.</h3>
      <p>
        The constellation view anchors itself to synthesis pages — the wiki's
        deliberate overviews. This project doesn&rsquo;t have one yet.
      </p>
      <div className="ce-actions">
        <button
          type="button"
          className="ce-primary"
          onClick={fire}
          disabled={busy || queued || projectId === null}
        >
          {queued ? "Synthesis queued — check Jobs" : busy ? "Queuing…" : "Generate a synthesis →"}
        </button>
        <button type="button" className="ce-secondary" onClick={onSwitchToFull}>
          Or switch to Full graph
        </button>
      </div>
      {error && <div className="ce-error">Couldn&rsquo;t queue: {error}</div>}
    </div>
  );
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

  // ── View mode (constellation | full) + weight encoding toggle ───
  // Per-project preference, hydrated from localStorage on mount.
  // Defaults: constellation + weight on. Slice 1 wires state only;
  // slices 2 & 4 read these to filter and style nodes.
  type MapView = "constellation" | "full";
  const [view, setView] = useState<MapView>("constellation");
  const [weight, setWeight] = useState<boolean>(true);
  useEffect(() => {
    if (projectId === null) return;
    const v = window.localStorage.getItem(`wikilm.map.view.${projectId}`);
    if (v === "constellation" || v === "full") setView(v);
    const w = window.localStorage.getItem(`wikilm.map.weight.${projectId}`);
    if (w === "on" || w === "off") setWeight(w === "on");
  }, [projectId]);
  const setViewPersist = useCallback(
    (v: MapView) => {
      setView(v);
      if (projectId !== null) window.localStorage.setItem(`wikilm.map.view.${projectId}`, v);
    },
    [projectId],
  );
  const setWeightPersist = useCallback(
    (w: boolean) => {
      setWeight(w);
      if (projectId !== null)
        window.localStorage.setItem(`wikilm.map.weight.${projectId}`, w ? "on" : "off");
    },
    [projectId],
  );

  // ── Selection (neighborhood view) ────────────────────────────────
  // Clicking a node selects it; clicking the SVG background deselects.
  // Double-click a node = navigate straight to the wiki page (preserves the
  // old quick-jump flow from the zero-feature-Map era).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  interface NodeDetail {
    slug: string;
    title: string;
    type: string;
    excerpt: string;
  }
  const [selectedDetail, setSelectedDetail] = useState<NodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  // ── Constellation filter ─────────────────────────────────────────
  // In "constellation" view, the layout sees only synthesis pages + their
  // 1-hop concept/entity neighbors. Sources, queries, outputs are dropped
  // from the layout entirely so the spread reflects the visible set.
  // In "full" view, everything goes in.
  const synthesisCount = useMemo(
    () => rawNodes.filter((n) => n.type === "synthesis").length,
    [rawNodes],
  );
  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (view === "full") return { layoutNodes: rawNodes, layoutEdges: rawEdges };
    const synthIds = new Set(rawNodes.filter((n) => n.type === "synthesis").map((n) => n.id));
    if (synthIds.size === 0) return { layoutNodes: [], layoutEdges: [] };
    const keep = new Set(synthIds);
    for (const e of rawEdges) {
      if (synthIds.has(e.from)) keep.add(e.to);
      if (synthIds.has(e.to)) keep.add(e.from);
    }
    const filteredNodes = rawNodes.filter(
      (n) => keep.has(n.id) && (n.type === "synthesis" || n.type === "concept" || n.type === "entity"),
    );
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = rawEdges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to));
    return { layoutNodes: filteredNodes, layoutEdges: filteredEdges };
  }, [rawNodes, rawEdges, view]);

  const { nodes, edges, bounds } = useMemo(() => {
    if (layoutNodes.length === 0)
      return {
        nodes: [] as LaidNode[],
        edges: [] as LaidEdge[],
        bounds: { width: BASE_WIDTH, height: BASE_HEIGHT },
      };
    const layoutScale = Math.max(1, Math.sqrt(layoutNodes.length / 40));
    const width = BASE_WIDTH * layoutScale;
    const height = BASE_HEIGHT * layoutScale;
    const result = forceLayout({
      nodes: layoutNodes.map((n) => ({ id: n.id, type: n.type, title: n.title, slug: n.slug })),
      edges: layoutEdges,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      iterations: 260,
    });
    return { ...result, bounds: { width, height } };
  }, [layoutNodes, layoutEdges]);

  const WIDTH = bounds.width;
  const HEIGHT = bounds.height;

  const typeCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of nodes) c.set(n.type, (c.get(n.type) ?? 0) + 1);
    return c;
  }, [nodes]);

  const clustering = useMemo(() => clusteringCoef(nodes, edges), [nodes, edges]);

  // Adjacency map powers neighborhood-highlighting AND the orphan / hub /
  // bridge markers. Built once per graph, shared across all memos below.
  const adjacency = useMemo(() => buildAdjacency(nodes, edges), [nodes, edges]);

  // ── Structural markers ───────────────────────────────────────────
  // Karpathy's point: the graph's value is in density + connectivity.
  // Surface the three shapes that matter without asking the user to run lint:
  //   orphans  = islands (no links either direction)
  //   hubs     = gravity wells (top-10% by degree)
  //   bridges  = connectors between clusters (top-5% by betweenness)
  const orphans = useMemo(() => findOrphans(nodes, adjacency), [nodes, adjacency]);
  const hubs = useMemo(() => findHubs(nodes, adjacency), [nodes, adjacency]);
  const bridges = useMemo(() => findBridges(nodes, adjacency), [nodes, adjacency]);

  // Retained for the pulse animation — single "biggest" hub, not the 10% set.
  const hubId = useMemo(() => {
    let best = "";
    let bestDeg = -1;
    for (const n of nodes) {
      const d = adjacency.get(n.id)?.size ?? 0;
      if (d > bestDeg) {
        bestDeg = d;
        best = n.id;
      }
    }
    return best || nodes[0]?.id || "";
  }, [adjacency, nodes]);

  // 1-hop neighborhood of the selected node (includes the node itself).
  const neighborhood = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set<string>([selectedId]);
    for (const n of adjacency.get(selectedId) ?? []) set.add(n);
    return set;
  }, [selectedId, adjacency]);

  const tooltipNode = hoverId ? nodes.find((n) => n.id === hoverId) : null;

  // Click → select (opens sidebar). Double-click → open the wiki page.
  const onNodeClick = useCallback(
    (n: LaidNode) => {
      setSelectedId((prev) => (prev === n.id ? null : n.id));
    },
    []
  );
  const onNodeDoubleClick = useCallback(
    (n: LaidNode) => {
      router.push(`/wiki?slug=${encodeURIComponent(n.slug)}`);
    },
    [router]
  );

  // Fetch the selected node's page body + resolve neighbor titles whenever
  // selection changes. Keep prior state visible while the new fetch runs.
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    const node = nodes.find((n) => n.id === selectedId);
    if (!node || projectId === null) return;
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/wiki/${encodeURIComponent(node.slug)}?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { title?: string; type?: string; body?: string } | null) => {
        if (cancelled || !d) return;
        // First non-empty, non-heading paragraph. Strip wikilink pipes for the
        // one-liner so `[[x|y]]` renders as `y`.
        const body = d.body ?? "";
        setSelectedDetail({
          slug: node.slug,
          title: d.title ?? node.title,
          type: d.type ?? node.type,
          excerpt: extractExcerpt(body),
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, nodes, projectId]);

  function edgeVisible(e: LaidEdge): boolean {
    if (!activeType) return true;
    const a = nodes.find((n) => n.id === e.from);
    const b = nodes.find((n) => n.id === e.to);
    if (!a || !b) return false;
    // Show an edge only when BOTH endpoints are the active type —
    // keeps the filtered view visually tight.
    return a.type === activeType && b.type === activeType;
  }

  function nodeVisible(n: LaidNode): boolean {
    if (!activeType) return true;
    return n.type === activeType;
  }

  // When a node is selected, non-neighborhood nodes + edges dim so the
  // neighborhood of interest pops. Returns an opacity multiplier in [0, 1].
  function selectionDim(id: string): number {
    if (!neighborhood) return 1;
    return neighborhood.has(id) ? 1 : 0.15;
  }
  function selectionDimEdge(e: LaidEdge): number {
    if (!neighborhood) return 1;
    const isIncident = neighborhood.has(e.from) && neighborhood.has(e.to);
    return isIncident ? 1 : 0.08;
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
          {orphans.size > 0 && (
            <div title="Nodes with no incoming or outgoing links">
              <b>{orphans.size}</b> orphan{orphans.size === 1 ? "" : "s"}
            </div>
          )}
          {hubs.size > 0 && (
            <div title="Top 10% of nodes by degree — the gravity wells of the graph">
              <b>{hubs.size}</b> hub{hubs.size === 1 ? "" : "s"}
            </div>
          )}
          {bridges.size > 0 && (
            <div title="Nodes that bridge otherwise-disconnected clusters">
              <b>{bridges.size}</b> bridge{bridges.size === 1 ? "" : "s"}
            </div>
          )}
          <div>
            Clustering <b>{clustering.toFixed(2)}</b>
          </div>
        </div>
      </div>

      <div className="map-rail">
        <div className="map-rail-group">
          <span className="map-rail-lab">View</span>
          <div className="map-seg">
            <button
              type="button"
              className={`map-seg-btn${view === "constellation" ? " active" : ""}`}
              onClick={() => setViewPersist("constellation")}
            >
              Constellation
            </button>
            <button
              type="button"
              className={`map-seg-btn${view === "full" ? " active" : ""}`}
              onClick={() => setViewPersist("full")}
            >
              Full graph
            </button>
          </div>
        </div>
        <div className="map-rail-group">
          <span className="map-rail-lab">Weight</span>
          <div className="map-seg">
            <button
              type="button"
              className={`map-seg-btn${weight ? " active" : ""}`}
              onClick={() => setWeightPersist(true)}
            >
              On
            </button>
            <button
              type="button"
              className={`map-seg-btn${!weight ? " active" : ""}`}
              onClick={() => setWeightPersist(false)}
            >
              Off
            </button>
          </div>
        </div>
      </div>

      <div className="mapwrap">
        {rawNodes.length === 0 ? (
          <div className="map-empty">No pages yet — the map will populate as you ingest.</div>
        ) : view === "constellation" && synthesisCount === 0 ? (
          <ConstellationEmpty
            projectId={projectId}
            onSwitchToFull={() => setViewPersist("full")}
          />
        ) : (
          <>
            <svg
              ref={svgRef}
              viewBox={`${-pan.x} ${-pan.y} ${WIDTH / zoom} ${HEIGHT / zoom}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ cursor: dragging ? "grabbing" : "grab" }}
              onMouseDown={(e) => {
                // Only start dragging from the SVG background, not from a node
                if ((e.target as Element).tagName === "circle") return;
                // Clicking empty SVG background clears any selection.
                if (selectedId) setSelectedId(null);
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
                // Any wheel event zooms (no modifier needed), so trackpad
                // pinch + scroll-to-zoom both work naturally.
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                setZoom((z) => Math.max(0.3, Math.min(6, z * delta)));
              }}
            >
              {/* edges */}
              {edges.map((e, i) => {
                if (!edgeVisible(e)) return null;
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
                    opacity={0.55 * selectionDimEdge(e)}
                    className="map-edge"
                  />
                );
              })}

              {/* hub pulse */}
              {hubId && nodes.length > 0 && (() => {
                const hub = nodes.find((n) => n.id === hubId);
                if (!hub || !nodeVisible(hub)) return null;
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

              {/* nodes — with structural markers:
                    • orphans: dashed outer ring, muted fill
                    • hubs: larger + accent pulse (top-10% by degree)
                    • bridges: accent ring (top-5% by betweenness)
                    • selection: green ring + full opacity, neighborhood kept
                      bright, rest dimmed to 15% */}
              {nodes.map((n) => {
                if (!nodeVisible(n)) return null;
                const isBigHub = n.id === hubId;
                const isHub = hubs.has(n.id);
                const isBridge = bridges.has(n.id);
                const isOrphan = orphans.has(n.id);
                const isSelected = selectedId === n.id;
                const isSynthesis = n.type === "synthesis";
                const fill = isBigHub ? "var(--accent)" : TYPE_COLOR_VAR[n.type] ?? "var(--ink)";
                const op = selectionDim(n.id);
                // Constellation view: syntheses get extra heft so they read as
                // anchors at a glance; concept/entity orbits stay nominal.
                const constellationBoost = view === "constellation" && isSynthesis ? 1.6 : 1;
                const scale = (isHub ? 1.3 : 1) * constellationBoost;
                // In constellation view, syntheses always show their label
                // regardless of radius; orbiters keep the existing rule.
                const showLabel = (view === "constellation" && isSynthesis) || n.r >= 8;
                const labelSize = view === "constellation" && isSynthesis ? 13 : 10.5;
                const labelFill = view === "constellation" && isSynthesis ? "var(--ink)" : "var(--ink-2)";
                return (
                  <g key={n.id} opacity={op}>
                    {isBridge && !isOrphan && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r * scale + 3}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={1.2}
                        pointerEvents="none"
                      />
                    )}
                    {isSelected && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r * scale + 6}
                        fill="none"
                        stroke="var(--green, #2f7d3b)"
                        strokeWidth={2}
                        pointerEvents="none"
                      />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r * scale}
                      fill={isOrphan ? "var(--paper)" : fill}
                      stroke={isOrphan ? "var(--ink-3)" : "var(--paper)"}
                      strokeWidth={isOrphan ? 1.2 : 1.5}
                      strokeDasharray={isOrphan ? "3 2" : undefined}
                      className="map-node"
                      onMouseEnter={() => setHoverId(n.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={() => onNodeClick(n)}
                      onDoubleClick={() => onNodeDoubleClick(n)}
                      style={{ cursor: "pointer" }}
                    />
                    {showLabel && (
                      <text
                        x={n.x}
                        y={n.y + n.r * scale + 12}
                        textAnchor="middle"
                        fontFamily="var(--font-serif)"
                        fontSize={labelSize}
                        fill={labelFill}
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
                onClick={() => setZoom((z) => Math.min(6, z * 1.25))}
                disabled={zoom >= 6}
              >
                +
              </button>
              <button
                type="button"
                title="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
                disabled={zoom <= 0.3}
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

            {tooltipNode && tooltipPos && !selectedId && (
              <div
                className="map-tooltip show"
                style={{ left: tooltipPos.left, top: tooltipPos.top }}
              >
                <span className="t">{tooltipNode.title}</span>
                <span className="sub">{tooltipNode.type}</span>
              </div>
            )}

            {selectedId && (
              <div className="map-peek">
                <div className="map-peek-type">
                  {selectedDetail?.type?.toUpperCase() ?? (detailLoading ? "…" : "—")}
                </div>
                <div className="map-peek-body">
                  <div className="map-peek-title">
                    {selectedDetail?.title ?? (detailLoading ? "Loading…" : "—")}
                  </div>
                  {selectedDetail?.excerpt && (
                    <div className="map-peek-excerpt">{selectedDetail.excerpt}</div>
                  )}
                </div>
                <div className="map-peek-actions">
                  {selectedDetail && (
                    <>
                      <button
                        type="button"
                        className="map-peek-btn"
                        onClick={() =>
                          router.push(`/wiki?slug=${encodeURIComponent(selectedDetail.slug)}`)
                        }
                      >
                        Open page →
                      </button>
                      <button
                        type="button"
                        className="map-peek-btn primary"
                        onClick={() => {
                          const q = `Tell me about "${selectedDetail.title}" using the wiki.`;
                          router.push(`/chat?q=${encodeURIComponent(q)}`);
                        }}
                      >
                        Ask about this →
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="map-peek-x"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .map-peek {
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 14px;
          background: var(--paper);
          border: 1.5px solid var(--ink);
          box-shadow: 4px 4px 0 var(--ink);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 20;
          animation: peekIn 220ms ease;
        }
        @keyframes peekIn {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        .map-peek-type {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: var(--accent);
          flex-shrink: 0;
          width: 80px;
        }
        .map-peek-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .map-peek-title {
          font-family: var(--font-serif);
          font-size: 16px;
          font-weight: 600;
          line-height: 1.2;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .map-peek-excerpt {
          font-family: var(--font-serif);
          font-size: 12.5px;
          line-height: 1.4;
          color: var(--ink-3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .map-peek-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .map-peek-btn {
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-2);
          background: none;
          border: 1px solid var(--rule);
          padding: 7px 11px;
          border-radius: 2px;
          cursor: pointer;
          transition: color 120ms, border-color 120ms, background 120ms;
        }
        .map-peek-btn:hover {
          color: var(--ink);
          border-color: var(--ink);
        }
        .map-peek-btn.primary {
          color: var(--paper);
          background: var(--ink);
          border-color: var(--ink);
        }
        .map-peek-btn.primary:hover {
          background: var(--accent);
          border-color: var(--accent);
        }
        .map-peek-x {
          background: none;
          border: none;
          font-size: 22px;
          cursor: pointer;
          color: var(--ink-4);
          line-height: 1;
          padding: 0 6px;
        }
        .map-peek-x:hover {
          color: var(--ink);
        }
      `}</style>
    </div>
  );
}
