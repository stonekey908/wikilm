"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  id: string;
  title: string;
  url: string;
  relevance: number;
  domain: string;
  author: string;
  type: string;
  summary: string;
  tags: string[];
  status: "pending" | "approved" | "skipped" | "bookmarked";
}

type Tab = "library" | "research";
type KindFilter = "" | "pdf" | "web" | "note";
type SortMode = "relevance" | "stream";

const KIND_LABEL: Record<"pdf" | "web" | "note", string> = {
  pdf: "PDF",
  web: "URL",
  note: "Note",
};
const KIND_ORDER: ("pdf" | "web" | "note")[] = ["pdf", "web", "note"];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** Project-scoped research persistence — each project keeps its own
 *  query + candidate list in localStorage, so switching projects
 *  preserves work-in-progress on both sides. */
const researchQueryKey = (projectId: number) => `sb_research:${projectId}:query`;
const researchResultsKey = (projectId: number) => `sb_research:${projectId}:results`;

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
  if (s.type === "web" && s.filePath && /^https?:\/\//.test(s.filePath)) return s.filePath;
  const m = parseMeta(s.meta);
  const url = (m.url as string | undefined) ?? (m.source_url as string | undefined);
  if (url && /^https?:\/\//.test(url)) return url;
  return null;
}

function dayOfWeek(iso: string): number {
  return new Date(iso).getDay();
}

function relevanceClass(pct: number): string {
  if (pct >= 85) return "hi";
  if (pct >= 70) return "mid";
  return "lo";
}

function IntakePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const projectId = activeProject?.id ?? null;

  // ── Tab state ────────────────────────────────────────────────────
  const urlTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(urlTab === "research" ? "research" : "library");

  // ── Library state ────────────────────────────────────────────────
  const [sources, setSources] = useState<Source[]>([]);
  const [kind, setKind] = useState<KindFilter>("");
  const [approving, setApproving] = useState<Set<number>>(new Set());
  const [slideOut, setSlideOut] = useState<Set<number>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [quickUrl, setQuickUrl] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Research state (project-scoped persistence) ─────────────────
  const [researchQuery, setResearchQuery] = useState<string>("");
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [maxResults, setMaxResults] = useState(8);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const nextResultId = useRef<number>(0);

  // ── Load project-scoped research state when project changes ─────
  useEffect(() => {
    if (projectId === null) return;
    try {
      const q = localStorage.getItem(researchQueryKey(projectId)) ?? "";
      const rRaw = localStorage.getItem(researchResultsKey(projectId));
      const r: ResearchResult[] = rRaw ? JSON.parse(rRaw) : [];
      setResearchQuery(q);
      setResults(r);
      // Bump the id counter past any persisted ids so new results don't collide
      const maxId = r
        .map((x) => Number(x.id.replace(/^r/, "")))
        .filter((n) => Number.isFinite(n))
        .reduce((a, b) => Math.max(a, b), -1);
      nextResultId.current = maxId + 1;
    } catch {}
  }, [projectId]);

  // ── Persist on change (scoped to current project) ───────────────
  useEffect(() => {
    if (projectId === null) return;
    try {
      localStorage.setItem(researchResultsKey(projectId), JSON.stringify(results));
    } catch {}
  }, [results, projectId]);

  useEffect(() => {
    if (projectId === null) return;
    try {
      localStorage.setItem(researchQueryKey(projectId), researchQuery);
    } catch {}
  }, [researchQuery, projectId]);

  // ── Sources fetch ────────────────────────────────────────────────
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
    const interval = window.setInterval(fetchSources, 4000);
    return () => window.clearInterval(interval);
  }, [fetchSources]);

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

  // ── Library actions ─────────────────────────────────────────────
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

  async function submitQuickUrl() {
    const q = quickUrl.trim();
    if (!q || !projectId) return;
    setQuickBusy(true);
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
        setQuickUrl("");
        fetchSources();
      } else {
        // Not a URL → switch to research tab + kick off
        setQuickUrl("");
        setResearchQuery(q);
        setTab("research");
        router.replace(`/sources?tab=research`);
        window.setTimeout(() => startResearch(q), 40);
      }
    } catch {
      addToast({ type: "error", title: "Couldn't queue" });
    } finally {
      setQuickBusy(false);
    }
  }

  // ── Research: SSE stream ────────────────────────────────────────
  // Tracks which topic produced the currently-held results. When a user
  // types a *new* topic and hits Commission, we confirm before wiping —
  // when they hit Commission without changing the topic (or use Load more),
  // we preserve the existing list and just append.
  const [resultsTopic, setResultsTopic] = useState<string>("");
  useEffect(() => {
    // On project switch, sync resultsTopic from persisted query if we have results
    if (results.length > 0 && !resultsTopic) setResultsTopic(researchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const runResearch = useCallback(
    async (topicOverride: string | undefined, append: boolean) => {
      const topic = (topicOverride ?? researchQuery).trim();
      if (!topic || isSearching || !projectId) return;

      // If the topic matches the existing results' topic, always append
      // (preserve prior work). Only wipe when the topic genuinely changes.
      const topicChanged = resultsTopic && resultsTopic !== topic && results.length > 0;
      const effectiveAppend = append || (!topicChanged && results.length > 0);

      if (topicChanged && !append) {
        const ok = window.confirm(
          `Replace ${results.length} result${results.length === 1 ? "" : "s"} for "${resultsTopic}" with a fresh search for "${topic}"?`
        );
        if (!ok) return;
      }

      const seenUrls = new Set<string>(
        effectiveAppend ? results.map((r) => r.url).filter(Boolean) : []
      );
      let addedThisRun = 0;

      if (!effectiveAppend) {
        setResults([]);
        nextResultId.current = 0;
      }
      setResultsTopic(topic);
      setIsSearching(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/sources/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            projectId,
            maxResults,
            excludeUrls: append ? Array.from(seenUrls) : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setIsSearching(false);
          addToast({ type: "error", title: "Research failed to start" });
          return;
        }

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
            // The endpoint emits SSE-framed lines: `data: {json}`
            // AND/OR raw `RESULT:{json}` lines depending on provider.
            let payload: string | null = null;
            if (line.startsWith("data: ")) {
              payload = line.slice(6);
            } else if (line.startsWith("data:")) {
              payload = line.slice(5);
            } else if (line.startsWith("RESULT:")) {
              // Raw form — parse the JSON directly
              try {
                const json = JSON.parse(line.slice(7));
                const url = json.url ?? "";
                if (url && seenUrls.has(url)) continue;
                if (url) seenUrls.add(url);
                const r: ResearchResult = {
                  id: `r${nextResultId.current++}`,
                  title: json.title ?? "Untitled",
                  url,
                  domain: json.domain ?? "",
                  author: json.author ?? "Unknown",
                  type: json.type ?? "Article",
                  summary: json.summary ?? "",
                  relevance: json.relevance ?? 50,
                  tags: json.tags ?? [],
                  status: "pending",
                };
                setResults((prev) => [...prev, r]);
                addedThisRun++;
              } catch {}
              continue;
            } else {
              continue;
            }

            try {
              const evt = JSON.parse(payload);
              if (evt.type === "content" && typeof evt.text === "string") {
                const text: string = evt.text;
                if (text.startsWith("RESULT:")) {
                  try {
                    const json = JSON.parse(text.slice(7));
                    const url = json.url ?? "";
                    if (url && seenUrls.has(url)) continue;
                    if (url) seenUrls.add(url);
                    const r: ResearchResult = {
                      id: `r${nextResultId.current++}`,
                      title: json.title ?? "Untitled",
                      url,
                      domain: json.domain ?? "",
                      author: json.author ?? "Unknown",
                      type: json.type ?? "Article",
                      summary: json.summary ?? "",
                      relevance: json.relevance ?? 50,
                      tags: json.tags ?? [],
                      status: "pending",
                    };
                    setResults((prev) => [...prev, r]);
                    addedThisRun++;
                  } catch {}
                }
              } else if (evt.type === "done") {
                // stream will end naturally
              }
            } catch {
              // Not JSON — check if the payload itself contains RESULT: (some providers)
              if (payload.startsWith("RESULT:")) {
                try {
                  const json = JSON.parse(payload.slice(7));
                  const url = json.url ?? "";
                  if (url && seenUrls.has(url)) continue;
                  if (url) seenUrls.add(url);
                  const r: ResearchResult = {
                    id: `r${nextResultId.current++}`,
                    title: json.title ?? "Untitled",
                    url,
                    domain: json.domain ?? "",
                    author: json.author ?? "Unknown",
                    type: json.type ?? "Article",
                    summary: json.summary ?? "",
                    relevance: json.relevance ?? 50,
                    tags: json.tags ?? [],
                    status: "pending",
                  };
                  setResults((prev) => [...prev, r]);
                  addedThisRun++;
                } catch {}
              }
            }
          }
        }

        if (effectiveAppend && addedThisRun === 0) {
          addToast({
            type: "info",
            title: "No new sources found",
            description: "The model couldn't turn up anything beyond what's already listed.",
          });
        } else if (!effectiveAppend) {
          addToast({ type: "success", title: `Found ${addedThisRun} source${addedThisRun === 1 ? "" : "s"}` });
        } else {
          addToast({ type: "success", title: `Added ${addedThisRun} more` });
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // user cancelled
        } else {
          addToast({ type: "error", title: "Research failed" });
        }
      } finally {
        setIsSearching(false);
        abortRef.current = null;
      }
    },
    [researchQuery, isSearching, maxResults, results, resultsTopic, projectId, addToast]
  );

  const startResearch = useCallback(
    (topicOverride?: string) => runResearch(topicOverride, false),
    [runResearch]
  );

  const loadMore = useCallback(() => runResearch(undefined, true), [runResearch]);

  const cancelResearch = useCallback(() => {
    abortRef.current?.abort();
    setIsSearching(false);
  }, []);

  const clearResearch = useCallback(() => {
    abortRef.current?.abort();
    setIsSearching(false);
    setResults([]);
    setResearchQuery("");
    setResultsTopic("");
    if (projectId !== null) {
      try {
        localStorage.removeItem(researchQueryKey(projectId));
        localStorage.removeItem(researchResultsKey(projectId));
      } catch {}
    }
  }, [projectId]);

  // ── Auto-trigger from URL params (Ledger → Intake handoff) ─────
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    const urlTopic = searchParams.get("topic");
    if (urlTab === "research") setTab("research");
    if (urlTopic && projectId !== null) {
      autoRan.current = true;
      setResearchQuery(urlTopic);
      startResearch(urlTopic);
      router.replace("/sources?tab=research");
    }
  }, [searchParams, urlTab, projectId, router, startResearch]);

  // ── Research result actions ─────────────────────────────────────
  async function setResultStatus(id: string, status: ResearchResult["status"]) {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

    if (status === "approved") {
      const result = results.find((r) => r.id === id);
      if (!result || !projectId) return;
      try {
        const res = await fetch("/api/sources/ingest-web", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: result.title,
            url: result.url,
            domain: result.domain,
            author: result.author,
            type: result.type,
            summary: result.summary,
            tags: result.tags,
            projectId,
            ingest: false,
          }),
        });
        if (res.ok) {
          addToast({ type: "success", title: `Queued · ${result.domain || result.url}` });
          fetchSources();
        } else {
          throw new Error();
        }
      } catch {
        addToast({ type: "error", title: "Couldn't queue source" });
      }
    }
  }

  const visibleResults = useMemo(() => {
    const list = results.filter((r) => r.status !== "skipped");
    if (sortMode === "relevance") {
      // Stable sort: relevance desc, ties keep insertion order
      return [...list].sort((a, b) => b.relevance - a.relevance);
    }
    return list;
  }, [results, sortMode]);
  const approvedCount = results.filter((r) => r.status === "approved").length;
  const totalCount = results.length;

  // ── Drop handlers ────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────
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

      <div className="intake-tabs">
        <button
          type="button"
          className={`intake-tab${tab === "library" ? " on" : ""}`}
          onClick={() => {
            setTab("library");
            router.replace("/sources");
          }}
        >
          Library <span className="c">{sources.length}</span>
        </button>
        <button
          type="button"
          className={`intake-tab${tab === "research" ? " on" : ""}`}
          onClick={() => {
            setTab("research");
            router.replace("/sources?tab=research");
          }}
        >
          Research {totalCount > 0 && <span className="c">{totalCount}</span>}
        </button>
      </div>

      {tab === "library" ? (
        <div key="library-tab" className="intake-tab-panel sources-layout">
          <div>
            <div className="drop-tools">
              <div className="drop-url">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6.5 9.5a2 2 0 012.83 0l2 2a2 2 0 010 2.83l-1.5 1.5a2 2 0 01-2.83 0l-.5-.5M9.5 6.5a2 2 0 00-2.83 0l-2 2a2 2 0 000 2.83l.5.5" />
                </svg>
                <input
                  type="text"
                  placeholder="Paste a URL to ingest, or type a topic → Research tab"
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitQuickUrl();
                  }}
                  disabled={quickBusy}
                />
              </div>
              <button className="btn primary" onClick={submitQuickUrl} disabled={quickBusy || !quickUrl.trim()}>
                {quickBusy ? "Queueing…" : "Commission →"}
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
                Drop <em>any</em> file, or click to upload.
              </h4>
              <p>PDF, Markdown, text, audio, image — anything lands here as a pending source.</p>
              <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
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
                            <a href={extUrl} target="_blank" rel="noreferrer noopener" style={{ color: "inherit", textDecoration: "none" }}>
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
      ) : (
        // ── Research tab ──────────────────────────────────────────
        <div key="research-tab" className="intake-tab-panel" style={{ paddingTop: 18, maxWidth: 960 }}>
          <div className="drop-tools">
            <div className="drop-url">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="7" cy="7" r="5" />
                <line x1="10.5" y1="10.5" x2="14" y2="14" />
              </svg>
              <input
                type="text"
                placeholder="A topic, an open question, a name…"
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSearching) startResearch();
                }}
                disabled={isSearching}
              />
            </div>
            <button
              className="btn primary"
              onClick={() => startResearch()}
              disabled={!researchQuery.trim() || isSearching}
            >
              {isSearching
                ? "Searching…"
                : totalCount > 0 && resultsTopic === researchQuery.trim()
                  ? "Find more →"
                  : totalCount > 0
                    ? "New search →"
                    : "Commission →"}
            </button>
          </div>

          {(totalCount > 0 || isSearching) && (
            <div className="research-controls">
              {totalCount > 0 && !isSearching && (
                <>
                  <button className="btn" onClick={loadMore} disabled={!researchQuery.trim()}>
                    + Load {maxResults} more
                  </button>
                  <button className="btn ghost" onClick={clearResearch}>
                    Clear
                  </button>
                </>
              )}
              {isSearching && (
                <>
                  <span className="research-live">
                    <span className="d" />
                    Streaming · {totalCount} found
                  </span>
                  <button className="btn red" onClick={cancelResearch}>
                    Stop
                  </button>
                </>
              )}
              {!isSearching && totalCount > 0 && (
                <span className="research-count">
                  <b>{totalCount}</b> candidates · <b>{approvedCount}</b> queued
                </span>
              )}
              {totalCount > 0 && (
                <div className="max-sel">
                  <span>Sort</span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="stream">Stream order</option>
                  </select>
                </div>
              )}
              <div className="max-sel">
                <span>Per run</span>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  disabled={isSearching}
                >
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>
          )}

          {isSearching && <div className="research-shimmer" />}

          {visibleResults.length === 0 && !isSearching ? (
            <div className="research-empty">
              {totalCount === 0
                ? "No results yet. Enter a topic above and commission."
                : "All candidates handled. Load more to continue."}
            </div>
          ) : (
            <div>
              {visibleResults.map((r, i) => {
                const isApproved = r.status === "approved";
                return (
                  <div key={r.id} className={`research-row${isApproved ? " approved" : ""}`}>
                    <div className="num">{String(i + 1).padStart(2, "0")}</div>
                    <div className="body">
                      <div className="t">
                        <a href={r.url} target="_blank" rel="noreferrer noopener">
                          {r.title}
                        </a>
                      </div>
                      <div className="sub">
                        <span className={`rel-pill ${relevanceClass(r.relevance)}`}>{r.relevance}%</span>
                        {r.domain || (() => {
                          try {
                            return new URL(r.url).hostname;
                          } catch {
                            return r.url;
                          }
                        })()}
                        {r.author && r.author !== "Unknown" && ` · ${r.author}`}
                        {r.type && ` · ${r.type}`}
                      </div>
                      <div className="ext">{r.summary}</div>
                      {r.tags && r.tags.length > 0 && (
                        <div className="research-tags">
                          {r.tags.slice(0, 5).map((t) => (
                            <span key={t} className="tag">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="acts">
                      {isApproved ? (
                        <span className="seal acc">Queued</span>
                      ) : (
                        <button className="btn primary" onClick={() => setResultStatus(r.id, "approved")}>
                          Approve
                        </button>
                      )}
                      <button className="btn red" onClick={() => setResultStatus(r.id, "skipped")}>
                        Skip
                      </button>
                    </div>
                  </div>
                );
              })}
              {isSearching && (
                <div className="research-empty" style={{ textAlign: "center", paddingTop: 22 }}>
                  <span className="research-live">
                    <span className="d" />
                    Streaming more candidates…
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <IntakePageInner />
    </Suspense>
  );
}
