/** Lightweight force-directed layout — no external deps.
 *  Good enough for 50–500 node wikis; runs a fixed tick count on load. */

export interface LaidNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  type: string;
  title: string;
  slug: string;
}

export interface LaidEdge {
  from: string;
  to: string;
  crossProject?: boolean;
}

interface ForceInput {
  nodes: { id: string; type: string; title: string; slug: string }[];
  edges: { from: string; to: string; crossProject?: boolean }[];
  width: number;
  height: number;
  iterations?: number;
}

export function forceLayout({
  nodes,
  edges,
  width,
  height,
  iterations = 260,
}: ForceInput): { nodes: LaidNode[]; edges: LaidEdge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] };
  // Scale the canvas with node count so larger graphs get breathing room
  // without collapsing into a single dense cluster.
  const scale = Math.max(1, Math.sqrt(nodes.length / 40));
  width = width * scale;
  height = height * scale;
  iterations = Math.min(420, Math.round(iterations * Math.sqrt(scale)));
  const laid: LaidNode[] = nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.32;
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      slug: n.slug,
      x: width / 2 + Math.cos(angle) * radius * (0.6 + Math.random() * 0.4),
      y: height / 2 + Math.sin(angle) * radius * (0.6 + Math.random() * 0.4),
      vx: 0,
      vy: 0,
      r: radiusFor(n.type),
    };
  });

  const indexById = new Map<string, number>();
  laid.forEach((n, i) => indexById.set(n.id, i));

  const resolvedEdges: LaidEdge[] = edges.filter(
    (e) => indexById.has(e.from) && indexById.has(e.to)
  );

  const degree = new Map<string, number>();
  for (const e of resolvedEdges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  // Grow node radii a touch with degree so hubs read as hubs
  for (const n of laid) {
    const d = degree.get(n.id) ?? 0;
    n.r = Math.min(22, n.r + Math.sqrt(d) * 1.2);
  }

  // Stronger repulsion coefficient — keeps hubs from overlapping each other
  // and spreads out leaf nodes around their parents.
  const k = Math.sqrt((width * height) / Math.max(1, laid.length)) * 1.25;
  const center = { x: width / 2, y: height / 2 };

  for (let t = 0; t < iterations; t++) {
    const temp = Math.max(0.02, 1 - t / iterations) * 12;

    // Repulsion O(n^2). Fine for our scale.
    for (let i = 0; i < laid.length; i++) {
      const a = laid[i];
      a.vx = 0;
      a.vy = 0;
      for (let j = 0; j < laid.length; j++) {
        if (i === j) continue;
        const b = laid[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = (k * k) / dist;
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
      }
    }

    // Spring attraction along edges
    for (const e of resolvedEdges) {
      const ai = indexById.get(e.from)!;
      const bi = indexById.get(e.to)!;
      const a = laid[ai];
      const b = laid[bi];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const force = (dist * dist) / k;
      a.vx -= (dx / dist) * force * 0.5;
      a.vy -= (dy / dist) * force * 0.5;
      b.vx += (dx / dist) * force * 0.5;
      b.vy += (dy / dist) * force * 0.5;
    }

    // Mild pull to center (weaker so clusters don't collapse into a blob)
    for (const n of laid) {
      n.vx += (center.x - n.x) * 0.003;
      n.vy += (center.y - n.y) * 0.003;
    }

    // Apply velocity with temperature cap
    for (const n of laid) {
      const mag = Math.sqrt(n.vx * n.vx + n.vy * n.vy) + 0.01;
      const cap = Math.min(mag, temp);
      n.x += (n.vx / mag) * cap;
      n.y += (n.vy / mag) * cap;
      // Keep inside bounds
      const pad = 32;
      if (n.x < pad) n.x = pad;
      if (n.x > width - pad) n.x = width - pad;
      if (n.y < pad) n.y = pad;
      if (n.y > height - pad) n.y = height - pad;
    }
  }

  // Post-pass: enforce a minimum-distance separation between every pair so
  // overlapping circles (frequent in dense clusters) get nudged apart.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i];
        const b = laid[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const minDist = a.r + b.r + 8;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  }

  return { nodes: laid, edges: resolvedEdges };
}

export function radiusFor(type: string): number {
  switch (type) {
    case "synthesis": return 14;
    case "concept": return 8;
    case "entity": return 7;
    case "source": return 6;
    case "comparison": return 7;
    case "query": return 5;
    case "output": return 6;
    default: return 5;
  }
}
