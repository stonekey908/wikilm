"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { cx, readStream, useProjectId } from "../lib";
import type { ResearchResult, SourceRow } from "../types";

const KIND_ORDER = ["pdf", "web", "note"];
const KIND_LABEL: Record<string, string> = { pdf: "PDF", web: "URL", note: "Note" };
type SortMode = "relevance" | "stream";

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function host(url?: string | null) {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
function relClass(r: number) { return r >= 85 ? "hi" : r >= 70 ? "mid" : "lo"; }

interface ResItem extends ResearchResult { _id: string; status: "pending" | "approved" | "skipped" }

export function SourcesView({ onOpenWiki }: { onOpenWiki: () => void }) {
  const projectId = useProjectId();
  const { addToast } = useToast();
  const [tab, setTab] = useState<"library" | "research">("library");

  // ---- Library ----
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [kind, setKind] = useState<string>("");

  const loadSources = useCallback(() => {
    if (projectId === null) return;
    fetch(`/api/sources?projectId=${projectId}`).then((r) => r.json())
      .then((d: { sources?: SourceRow[] }) => setSources(d.sources ?? [])).catch(() => {});
  }, [projectId]);
  useEffect(() => { loadSources(); }, [loadSources]);

  const kindCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sources) { const k = s.type || "note"; m[k] = (m[k] ?? 0) + 1; }
    return m;
  }, [sources]);
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { pending: 0, ingesting: 0, failed: 0 };
    for (const s of sources) { const st = s.status || "ingested"; if (st in m) m[st]++; }
    return m;
  }, [sources]);
  const visibleSources = useMemo(() => {
    const list = kind ? sources.filter((s) => (s.type || "note") === kind) : sources;
    return [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [sources, kind]);

  const del = async (id: number) => {
    try { await fetch(`/api/sources/${id}`, { method: "DELETE" }); } catch {}
    addToast({ type: "info", title: "Source deleted" });
    loadSources();
  };

  // ---- Research ----
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState<ResItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [maxResults, setMaxResults] = useState(8);
  const abort = useRef<AbortController | null>(null);

  const runResearch = async (append: boolean) => {
    if (!topic.trim() || projectId === null || searching) return;
    if (!append) setResults([]);
    setSearching(true);
    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    const exclude = append ? results.map((r) => r.url).filter(Boolean) as string[] : [];
    try {
      const res = await fetch(`/api/sources/research`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), projectId, maxResults, excludeUrls: exclude }), signal: ac.signal,
      });
      await readStream(res, (line) => {
        const i = line.indexOf("{");
        if (i >= 0 && (line.startsWith("RESULT") || line.startsWith("data:"))) {
          try {
            const r = JSON.parse(line.slice(i)) as ResearchResult;
            setResults((prev) => prev.some((p) => p.url && p.url === r.url)
              ? prev : [...prev, { ...r, _id: `${Date.now()}-${prev.length}`, status: "pending" }]);
          } catch {}
        }
      }, ac.signal);
    } catch { addToast({ type: "error", title: "Research failed", description: "Could not reach the research endpoint." }); }
    setSearching(false);
  };
  const setStatus = (id: string, status: ResItem["status"]) =>
    setResults((rs) => rs.map((r) => (r._id === id ? { ...r, status } : r)));

  const visibleResults = useMemo(() => {
    const list = results.filter((r) => r.status !== "skipped");
    return sortMode === "relevance"
      ? [...list].sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
      : list;
  }, [results, sortMode]);
  const approvedCount = results.filter((r) => r.status === "approved").length;

  return (
    <section className="view active">
      <div className="page">
        <div className="page-head"><h1 className="page-title">Sources</h1><p className="page-sub">Raw materials feeding the wiki — manage the library and discover new candidates.</p></div>

        <div className="intake-tabs">
          <button className={cx("intake-tab", tab === "library" && "on")} onClick={() => setTab("library")}>Library <span className="c">{sources.length}</span></button>
          <button className={cx("intake-tab", tab === "research" && "on")} onClick={() => setTab("research")}>Research {results.length > 0 && <span className="c">{results.length}</span>}</button>
        </div>

        {tab === "library" && (
          <div className="lib-cols">
            <div className="lib-main">
              {visibleSources.length === 0 && (
                <div className="empty"><div className="et">No sources{kind ? ` of kind ${KIND_LABEL[kind]}` : ""}</div><div className="es">Switch to Research to discover and ingest some.</div></div>
              )}
              {visibleSources.map((s, i) => {
                const st = s.status || "ingested";
                const seal = st === "pending" || st === "ingesting" ? "acc" : st === "failed" ? "red" : "ghost";
                const k = s.type || "note";
                return (
                  <div key={s.id} className="intake-row">
                    <div className="num">{String(i + 1).padStart(3, "0")}</div>
                    <div className="stamp-card"><div className="k">{KIND_LABEL[k] || k}</div><div className="s">{s.id}</div></div>
                    <div className="ib">
                      <div className="t" onClick={onOpenWiki}>{s.title}</div>
                      <div className="sub">{[s.author, host(s.url), fmtDate(s.createdAt), s.pageCount ? `${s.pageCount}p` : ""].filter(Boolean).join(" · ")}</div>
                      {s.summary && <div className="ext">{s.summary}</div>}
                    </div>
                    <div className="acts">
                      <span className={`seal ${seal}`}>{st}</span>
                      {s.url && <a className="abtn" href={s.url} target="_blank" rel="noreferrer">Open</a>}
                      {st === "failed" && <button className="abtn primary" onClick={() => addToast({ type: "info", title: "Retry queued" })}>Retry</button>}
                      <button className="abtn red" onClick={() => del(s.id)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="lib-rail">
              <div className="fr-card">
                <h4>Filter by kind</h4>
                <button className={cx("fr-row", !kind && "on")} onClick={() => setKind("")}><span className="d" /><span>All</span><span className="c">{sources.length}</span></button>
                {KIND_ORDER.filter((k) => kindCounts[k]).map((k) => (
                  <button key={k} className={cx("fr-row", kind === k && "on")} onClick={() => setKind(kind === k ? "" : k)}>
                    <span className="d" /><span>{KIND_LABEL[k]}</span><span className="c">{kindCounts[k]}</span>
                  </button>
                ))}
              </div>
              <div className="fr-card">
                <h4>Queue health</h4>
                <div className="fr-stat"><span>Pending</span><span className="v">{statusCounts.pending}</span></div>
                <div className="fr-stat"><span>Ingesting</span><span className="v">{statusCounts.ingesting}</span></div>
                <div className="fr-stat"><span>Failed</span><span className="v" style={{ color: statusCounts.failed ? "var(--red)" : undefined }}>{statusCounts.failed}</span></div>
              </div>
            </aside>
          </div>
        )}

        {tab === "research" && (
          <div style={{ maxWidth: 940 }}>
            <div className="drop-tools">
              <div className="drop-url">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-3)" strokeWidth={1.7}><circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" /></svg>
                <input placeholder="A topic, an open question, a name…" value={topic} onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !searching) runResearch(false); }} />
              </div>
              <button className="abtn primary lg" onClick={() => runResearch(false)} disabled={searching}>
                {searching ? "Searching…" : results.length ? "New search →" : "Commission →"}
              </button>
            </div>

            {(results.length > 0 || searching) && (
              <div className="research-controls">
                {searching && <span className="research-live"><span className="d" /> Streaming · {results.length} found</span>}
                {searching && <button className="abtn red" onClick={() => { abort.current?.abort(); setSearching(false); }}>Stop</button>}
                {!searching && results.length > 0 && <button className="abtn" onClick={() => runResearch(true)}>+ Load {maxResults} more</button>}
                {!searching && results.length > 0 && <button className="abtn ghost" onClick={() => setResults([])}>Clear</button>}
                {!searching && results.length > 0 && <span className="research-count"><b>{results.length}</b> candidates · <b>{approvedCount}</b> queued</span>}
                <div className="max-sel"><span>Sort</span>
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}><option value="relevance">Relevance</option><option value="stream">Stream order</option></select>
                </div>
                <div className="max-sel"><span>Per run</span>
                  <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))}><option value={4}>4</option><option value={8}>8</option><option value={12}>12</option><option value={20}>20</option></select>
                </div>
              </div>
            )}

            {visibleResults.length === 0 && !searching && <div className="research-empty">No results yet — commission a research pass above.</div>}
            <div>
              {visibleResults.map((r, i) => (
                <div key={r._id} className={cx("research-row", r.status === "approved" && "approved")}>
                  <div className="num">{String(i + 1).padStart(2, "0")}</div>
                  <div className="ib">
                    <div className="t">{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}</div>
                    <div className="sub">
                      {typeof r.relevance === "number" && <span className={`rel-pill ${relClass(r.relevance)}`}>{r.relevance}%</span>}
                      {[r.domain || host(r.url), r.author && r.author !== "Unknown" ? r.author : "", r.type].filter(Boolean).join(" · ")}
                    </div>
                    {r.summary && <div className="ext">{r.summary}</div>}
                    {!!(r.tags && r.tags.length) && <div className="research-tags">{r.tags!.slice(0, 5).map((t) => <span key={t} className="tag">{t}</span>)}</div>}
                  </div>
                  <div className="acts">
                    {r.status === "approved"
                      ? <span className="seal acc">Queued</span>
                      : <button className="abtn primary" onClick={() => { setStatus(r._id, "approved"); addToast({ type: "success", title: "Approved", description: "Queued for ingest." }); }}>Approve</button>}
                    <button className="abtn red" onClick={() => setStatus(r._id, "skipped")}>Skip</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
