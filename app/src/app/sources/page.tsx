"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";

interface Source {
  id: number;
  projectId: number;
  title: string;
  type: string;
  filePath: string;
  author: string | null;
  meta: string | null;
  status: string;
  pageCount: number | null;
  createdAt: string;
}

type KindFilter = "" | "pdf" | "web" | "note";
const KIND_LABEL: Record<"pdf" | "web" | "note", string> = {
  pdf: "PDF",
  web: "URL",
  note: "Note",
};
const KIND_ORDER: ("pdf" | "web" | "note")[] = ["pdf", "web", "note"];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function parseMeta(meta: string | null): Record<string, unknown> {
  if (!meta) return {};
  try {
    return JSON.parse(meta);
  } catch {
    return {};
  }
}

function subtitleFor(s: Source): string {
  const m = parseMeta(s.meta);
  if (s.author) return s.author;
  const domain = m.domain as string | undefined;
  if (domain) return domain;
  const label = KIND_LABEL[(s.type as "pdf" | "web" | "note")] ?? s.type.toUpperCase();
  const d = new Date(s.createdAt);
  return `${label} · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function extractFor(s: Source): string {
  const m = parseMeta(s.meta);
  const summary = (m.summary as string | undefined) ?? (m.description as string | undefined);
  if (summary) return summary;
  if (s.type === "web") return "Web source · awaiting ingestion.";
  if (s.type === "note") return "Captured note · awaiting ingestion.";
  return "Pending source · awaiting ingestion.";
}

function dayOfWeek(iso: string): number {
  const d = new Date(iso);
  return d.getDay();
}

export default function IntakePage() {
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const projectId = activeProject?.id ?? null;

  const [sources, setSources] = useState<Source[]>([]);
  const [kind, setKind] = useState<KindFilter>("");
  const [approving, setApproving] = useState<Set<number>>(new Set());
  const [slideOut, setSlideOut] = useState<Set<number>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [url, setUrl] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSources = useCallback(async () => {
    if (projectId === null) return;
    try {
      const res = await fetch(`/api/sources?projectId=${projectId}`);
      if (res.ok) {
        const d = await res.json();
        setSources(d.sources ?? []);
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    // Preload research topic from Ledger
    try {
      const q = localStorage.getItem("sb_research_query");
      if (q && !url) setUrl(q);
    } catch {}
  }, [url]);

  const filtered = useMemo(() => {
    let list = [...sources];
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (kind) list = list.filter((s) => s.type === kind);
    return list;
  }, [sources, kind]);

  const kindCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of sources) c[s.type] = (c[s.type] ?? 0) + 1;
    return c;
  }, [sources]);

  const weekBuckets = useMemo(() => {
    const days: number[] = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const s of sources) {
      const t = new Date(s.createdAt).getTime();
      if (t >= cutoff) days[dayOfWeek(s.createdAt)] += 1;
    }
    // Rotate so today is rightmost
    const today = new Date().getDay();
    const rotated: number[] = [];
    for (let i = 1; i <= 7; i++) rotated.push(days[(today + i) % 7]);
    return rotated;
  }, [sources]);

  const statusCounts = useMemo(() => {
    const c = { pending: 0, ingesting: 0, failed: 0, ingested: 0 };
    for (const s of sources) {
      if (s.status === "pending") c.pending++;
      else if (s.status === "ingesting") c.ingesting++;
      else if (s.status === "failed") c.failed++;
      else if (s.status === "ingested") c.ingested++;
    }
    return c;
  }, [sources]);

  const weekTotal = weekBuckets.reduce((a, b) => a + b, 0);
  const weekMax = Math.max(1, ...weekBuckets);

  async function approve(s: Source) {
    if (s.status !== "pending" || approving.has(s.id)) return;
    setApproving((p) => new Set(p).add(s.id));
    // Flash seal immediately
    try {
      const res = await fetch(`/api/sources/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ingest" }),
      });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Approved · page synthesized", description: s.title });
      // 1.1s → start slide out; 1.6s → remove from list
      window.setTimeout(() => {
        setSlideOut((p) => new Set(p).add(s.id));
      }, 1100);
      window.setTimeout(() => {
        setSources((p) => p.filter((x) => x.id !== s.id));
        setApproving((p) => {
          const n = new Set(p);
          n.delete(s.id);
          return n;
        });
        setSlideOut((p) => {
          const n = new Set(p);
          n.delete(s.id);
          return n;
        });
      }, 1600);
    } catch {
      addToast({ type: "error", title: "Couldn't approve" });
      setApproving((p) => {
        const n = new Set(p);
        n.delete(s.id);
        return n;
      });
    }
  }

  async function remove(s: Source) {
    if (!confirm(`Delete "${s.title}"? This removes the raw file + DB row.`)) return;
    try {
      const res = await fetch(`/api/sources/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Source deleted" });
      setSources((p) => p.filter((x) => x.id !== s.id));
    } catch {
      addToast({ type: "error", title: "Couldn't delete" });
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0 || !projectId) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", String(projectId));
      fd.append("ingest", "false");
      try {
        const res = await fetch("/api/sources/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error();
        addToast({ type: "success", title: `Queued · ${file.name}` });
      } catch {
        addToast({ type: "error", title: `Upload failed · ${file.name}` });
      }
    }
    fetchSources();
  }

  async function commissionUrl() {
    const q = url.trim();
    if (!q || !projectId) return;
    setUrlBusy(true);
    try {
      // If it looks like a URL, ingest-web directly; otherwise do research
      const isUrl = /^https?:\/\//.test(q);
      if (isUrl) {
        const res = await fetch("/api/sources/ingest-web", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: q, projectId }),
        });
        if (!res.ok) throw new Error();
        addToast({ type: "success", title: "Web source queued" });
      } else {
        await fetch("/api/sources/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: q, projectId }),
        });
        addToast({ type: "success", title: `Commissioning · ${q}` });
      }
      setUrl("");
      try {
        localStorage.removeItem("sb_research_query");
      } catch {}
      fetchSources();
    } catch {
      addToast({ type: "error", title: "Couldn't queue" });
    } finally {
      setUrlBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    uploadFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  return (
    <div className="pad">
      <EditorialBreadcrumbs tail="Intake" />

      <div className="sec-head">
        <h1>
          The <em>Intake.</em>
        </h1>
        <div className="rail-meta">
          <div>
            <b>{sources.length}</b> sources
          </div>
          <div>
            <b>{statusCounts.pending}</b> pending
          </div>
          <div>
            <b>{weekTotal}</b> this week
          </div>
        </div>
      </div>

      <div className="sources-layout">
        <div>
          <div className="drop-tools">
            <div className="drop-url">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6.5 9.5a2 2 0 012.83 0l2 2a2 2 0 010 2.83l-1.5 1.5a2 2 0 01-2.83 0l-.5-.5M9.5 6.5a2 2 0 00-2.83 0l-2 2a2 2 0 000 2.83l.5.5" />
              </svg>
              <input
                type="text"
                placeholder="Paste a URL or type a research topic…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commissionUrl();
                }}
                disabled={urlBusy}
              />
            </div>
            <button
              className="btn primary sm"
              onClick={commissionUrl}
              disabled={urlBusy || !url.trim()}
            >
              {urlBusy ? "Queueing…" : "Commission →"}
            </button>
          </div>

          <div
            className={`drop${dragActive ? " drag" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <h4>
              Drop a <em>PDF</em>, <em>note</em>, or click to upload.
            </h4>
            <p>Files land here as pending sources — approve them below.</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.md,.markdown,.txt"
              hidden
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </div>

          <div className="intake">
            {filtered.length === 0 ? (
              <div
                style={{
                  fontFamily: "var(--font-inst)",
                  fontStyle: "italic",
                  fontSize: 15,
                  color: "var(--ink-3)",
                  padding: "28px 0",
                }}
              >
                {kind ? `No ${KIND_LABEL[kind]} sources yet.` : "No sources in this project yet — drop one above."}
              </div>
            ) : (
              filtered.map((s, i) => {
                const isPending = s.status === "pending";
                const isApproved = approving.has(s.id);
                const isSliding = slideOut.has(s.id);
                const rowClass = `intake-row${isApproved ? " approved" : ""}${isSliding ? " slide-out" : ""}`;
                const kindLbl =
                  KIND_LABEL[s.type as "pdf" | "web" | "note"] ?? s.type.toUpperCase();
                return (
                  <div key={s.id} className={rowClass}>
                    <div className="num">{String(i + 1).padStart(3, "0")}</div>
                    <div className="stamp-card">
                      <div className="k">{kindLbl}</div>
                      <div className="s">{s.id}</div>
                    </div>
                    <div className="body">
                      <div className="t">{s.title}</div>
                      <div className="sub">{subtitleFor(s)}</div>
                      <div className="ext">{extractFor(s)}</div>
                    </div>
                    <div className="acts">
                      <span className={`seal ${isPending ? "acc" : s.status === "failed" ? "red" : "ghost"}`}>
                        {s.status}
                      </span>
                      {isPending && !isApproved && (
                        <button className="btn sm primary" onClick={() => approve(s)}>
                          Approve
                        </button>
                      )}
                      <button className="btn sm red" onClick={() => remove(s)} disabled={isApproved}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <aside>
          <div className="fr-card">
            <h4>Filter by kind</h4>
            <button
              type="button"
              className={`fr-row${kind === "" ? " on" : ""}`}
              onClick={() => setKind("")}
            >
              <span className="d" />
              <span>All</span>
              <span className="c">{sources.length}</span>
            </button>
            {KIND_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                className={`fr-row${kind === k ? " on" : ""}`}
                onClick={() => setKind(k)}
              >
                <span className="d" />
                <span>{KIND_LABEL[k]}</span>
                <span className="c">{kindCounts[k] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="fr-card">
            <h4>This week</h4>
            <div className="fr-chart">
              {weekBuckets.map((v, i) => (
                <div
                  key={i}
                  className={`bar${v === weekMax && weekMax > 0 ? " peak" : ""}`}
                  style={{ height: `${(v / weekMax) * 100}%` }}
                  title={`${v} source${v === 1 ? "" : "s"}`}
                />
              ))}
            </div>
            <div className="fr-chart-labels">
              {(() => {
                const labels: string[] = [];
                const today = new Date().getDay();
                for (let i = 1; i <= 7; i++) labels.push(DAY_LABELS[(today + i) % 7]);
                return labels.map((l, i) => <span key={i}>{l}</span>);
              })()}
            </div>
          </div>

          <div className="fr-card">
            <h4>Queue health</h4>
            <div className="fr-stat">
              <span>Pending</span>
              <span className="v">{statusCounts.pending}</span>
            </div>
            <div className="fr-stat">
              <span>Ingesting</span>
              <span className="v">{statusCounts.ingesting}</span>
            </div>
            <div className="fr-stat">
              <span>Failed</span>
              <span className="v">{statusCounts.failed}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
