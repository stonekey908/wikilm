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

interface ResearchResult {
  title: string;
  url: string;
  domain: string;
  author?: string;
  type?: string;
  summary: string;
  relevance?: number;
  tags?: string[];
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
  const label = KIND_LABEL[s.type as "pdf" | "web" | "note"] ?? s.type.toUpperCase();
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

function externalUrlFor(s: Source): string | null {
  // For web sources, filePath holds the original URL
  if (s.type === "web" && s.filePath && /^https?:\/\//.test(s.filePath)) {
    return s.filePath;
  }
  const m = parseMeta(s.meta);
  const url = (m.url as string | undefined) ?? (m.source_url as string | undefined);
  if (url && /^https?:\/\//.test(url)) return url;
  return null;
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
  const [commissionBusy, setCommissionBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Research stream state
  const [researchTopic, setResearchTopic] = useState<string>("");
  const [researchResults, setResearchResults] = useState<ResearchResult[]>([]);
  const [researchStreaming, setResearchStreaming] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [ingestingUrls, setIngestingUrls] = useState<Set<string>>(new Set());
  const researchAbortRef = useRef<AbortController | null>(null);

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
    try {
      const q = localStorage.getItem("sb_research_query");
      if (q) {
        setUrl(q);
        localStorage.removeItem("sb_research_query");
      }
    } catch {}
  }, []);

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
    const days: number[] = [0, 0, 0, 0, 0, 0, 0];
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const s of sources) {
      const t = new Date(s.createdAt).getTime();
      if (t >= cutoff) days[dayOfWeek(s.createdAt)] += 1;
    }
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
    try {
      const res = await fetch(`/api/sources/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ingest" }),
      });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Approved · page synthesized", description: s.title });
      window.setTimeout(() => setSlideOut((p) => new Set(p).add(s.id)), 1100);
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

  function clearResearch() {
    researchAbortRef.current?.abort();
    setResearchStreaming(false);
    setResearchResults([]);
    setResearchTopic("");
    setDismissed(new Set());
  }

  async function runResearch(topic: string) {
    if (!projectId) return;
    researchAbortRef.current?.abort();
    const controller = new AbortController();
    researchAbortRef.current = controller;
    setResearchTopic(topic);
    setResearchResults([]);
    setDismissed(new Set());
    setResearchStreaming(true);

    try {
      const res = await fetch("/api/sources/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, projectId }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("RESULT:")) {
            try {
              const json = JSON.parse(trimmed.slice(7).trim()) as ResearchResult;
              if (json.url && json.title) {
                setResearchResults((prev) => [...prev, json]);
              }
            } catch {}
          }
          if (trimmed === "DONE") {
            // server side; loop will end naturally
          }
        }
      }
      setResearchStreaming(false);
      addToast({ type: "success", title: "Research complete" });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        addToast({ type: "error", title: "Research failed" });
      }
      setResearchStreaming(false);
    }
  }

  async function ingestResearchUrl(r: ResearchResult) {
    if (!projectId || ingestingUrls.has(r.url)) return;
    setIngestingUrls((p) => new Set(p).add(r.url));
    try {
      const res = await fetch("/api/sources/ingest-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: r.url, projectId, ingest: false }),
      });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: `Queued · ${r.domain || r.url}` });
      setDismissed((p) => new Set(p).add(r.url));
      fetchSources();
    } catch {
      addToast({ type: "error", title: "Couldn't queue" });
    } finally {
      setIngestingUrls((p) => {
        const n = new Set(p);
        n.delete(r.url);
        return n;
      });
    }
  }

  async function commission() {
    const q = url.trim();
    if (!q || !projectId) return;
    setCommissionBusy(true);
    try {
      const isUrl = /^https?:\/\//.test(q);
      if (isUrl) {
        const res = await fetch("/api/sources/ingest-web", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: q, projectId, ingest: false }),
        });
        if (!res.ok) throw new Error();
        addToast({ type: "success", title: "Web source queued" });
        setUrl("");
        fetchSources();
      } else {
        // Research topic — stream results
        setUrl("");
        await runResearch(q);
      }
    } catch {
      addToast({ type: "error", title: "Couldn't commission" });
    } finally {
      setCommissionBusy(false);
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

  const visibleResearch = researchResults.filter((r) => !dismissed.has(r.url));

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
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6.5 9.5a2 2 0 012.83 0l2 2a2 2 0 010 2.83l-1.5 1.5a2 2 0 01-2.83 0l-.5-.5M9.5 6.5a2 2 0 00-2.83 0l-2 2a2 2 0 000 2.83l.5.5" />
              </svg>
              <input
                type="text"
                placeholder="Paste a URL to ingest, or type a research topic to commission…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commission();
                }}
                disabled={commissionBusy}
              />
            </div>
            <button className="btn primary" onClick={commission} disabled={commissionBusy || !url.trim()}>
              {commissionBusy ? "Queueing…" : "Commission →"}
            </button>
          </div>

          {(researchStreaming || researchResults.length > 0) && (
            <div className="research-panel">
              <div className="research-panel-head">
                <span className="n">§ Research</span>
                <h3>
                  <em>{researchTopic}</em>
                </h3>
                <span className={`pill${!researchStreaming ? " done" : ""}`}>
                  <span className="d" />
                  {researchStreaming ? "Streaming" : `${visibleResearch.length} results`}
                </span>
                <button className="btn sm ghost" onClick={clearResearch}>
                  {researchStreaming ? "Stop" : "Clear"}
                </button>
              </div>
              <div className="research-panel-body">
                {visibleResearch.length === 0 && !researchStreaming ? (
                  <div className="research-empty">No candidates — try a different topic.</div>
                ) : visibleResearch.length === 0 ? (
                  <div className="research-empty">Searching the web…</div>
                ) : (
                  visibleResearch.map((r, i) => (
                    <div key={r.url} className="research-row">
                      <div className="num">{String(i + 1).padStart(2, "0")}</div>
                      <div className="body">
                        <div className="t">
                          <a href={r.url} target="_blank" rel="noreferrer noopener">
                            {r.title}
                          </a>
                        </div>
                        <div className="sub">
                          {r.domain || new URL(r.url).hostname}
                          {r.type ? ` · ${r.type}` : ""}
                          {typeof r.relevance === "number" && <span className="rel">{r.relevance}%</span>}
                        </div>
                        <div className="ext">{r.summary}</div>
                      </div>
                      <div className="acts">
                        <button
                          className="btn primary"
                          onClick={() => ingestResearchUrl(r)}
                          disabled={ingestingUrls.has(r.url)}
                        >
                          {ingestingUrls.has(r.url) ? "Queueing…" : "Ingest"}
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() =>
                            setDismissed((p) => new Set(p).add(r.url))
                          }
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div
            className={`drop${dragActive ? " drag" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <h4>
              Drop <em>any</em> file, or click to upload.
            </h4>
            <p>PDF, Markdown, text, audio, image — anything lands here as a pending source.</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
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
                const kindLbl = KIND_LABEL[s.type as "pdf" | "web" | "note"] ?? s.type.toUpperCase();
                const extUrl = externalUrlFor(s);
                return (
                  <div key={s.id} className={rowClass}>
                    <div className="num">{String(i + 1).padStart(3, "0")}</div>
                    <div className="stamp-card">
                      <div className="k">{kindLbl}</div>
                      <div className="s">{s.id}</div>
                    </div>
                    <div className="body">
                      <div className="t">
                        {extUrl ? (
                          <a
                            href={extUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            style={{ color: "inherit", textDecoration: "none" }}
                          >
                            {s.title}
                          </a>
                        ) : (
                          s.title
                        )}
                      </div>
                      <div className="sub">
                        {extUrl ? (
                          <a className="link" href={extUrl} target="_blank" rel="noreferrer noopener">
                            {subtitleFor(s)}
                          </a>
                        ) : (
                          subtitleFor(s)
                        )}
                      </div>
                      <div className="ext">{extractFor(s)}</div>
                    </div>
                    <div className="acts">
                      <span className={`seal ${isPending ? "acc" : s.status === "failed" ? "red" : "ghost"}`}>
                        {s.status}
                      </span>
                      {isPending && !isApproved && (
                        <button className="btn primary" onClick={() => approve(s)}>
                          Approve
                        </button>
                      )}
                      <button className="btn red" onClick={() => remove(s)} disabled={isApproved}>
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
            <button type="button" className={`fr-row${kind === "" ? " on" : ""}`} onClick={() => setKind("")}>
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
