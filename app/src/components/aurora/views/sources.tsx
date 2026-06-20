"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { cx, hueColor, initialOf, readStream, useProjectId } from "../lib";
import type { ResearchResult, SourceRow } from "../types";

export function SourcesView({ onOpenWiki }: { onOpenWiki: () => void }) {
  const projectId = useProjectId();
  const { addToast } = useToast();
  const [tab, setTab] = useState<"library" | "research">("library");
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    fetch(`/api/sources?projectId=${projectId}`).then((r) => r.json())
      .then((d: { sources?: SourceRow[] }) => { if (!cancelled) setSources(d.sources ?? []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  const research = async () => {
    if (!topic.trim() || projectId === null || searching) return;
    setResults([]); setSearching(true);
    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    try {
      const res = await fetch(`/api/sources/research`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), projectId, maxResults: 8 }), signal: ac.signal,
      });
      await readStream(res, (line) => {
        const i = line.indexOf("{");
        if ((line.startsWith("RESULT") || line.startsWith("data:")) && i >= 0) {
          try { setResults((r) => [...r, JSON.parse(line.slice(i)) as ResearchResult]); } catch {}
        }
      }, ac.signal);
    } catch { addToast({ type: "error", title: "Research failed", description: "Could not reach the research endpoint." }); }
    setSearching(false);
  };

  return (
    <section className="view active">
      <div className="page">
        <div className="page-head row">
          <div><h1 className="page-title">Sources</h1><p className="page-sub">Manage raw materials and discover new ones</p></div>
          <span className="spacer" />
          <div className="seg">
            <button className={cx(tab === "library" && "on")} onClick={() => setTab("library")}>Library</button>
            <button className={cx(tab === "research" && "on")} onClick={() => setTab("research")}>Research</button>
          </div>
        </div>

        {tab === "library" && (
          <>
            {sources.length === 0 && (
              <div className="empty"><div className="ei"><svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 2h7l3 3v9H3z" /></svg></div><div className="et">No sources yet</div><div className="es">Switch to Research to discover and ingest some.</div></div>
            )}
            <div className="lib-grid">
              {sources.map((s) => (
                <div key={s.id} className="lib-card" onClick={onOpenWiki}>
                  <div className="lib-type"><span className="ld" style={{ background: hueColor(s.type || "src") }} />{s.type || "Source"}</div>
                  <div className="lib-title">{s.title}</div>
                  {s.url && <div className="lib-meta">{(() => { try { return new URL(s.url).hostname; } catch { return s.url; } })()}</div>}
                  <div className={cx("lib-status", (s.status === "ingested" || !s.status) ? "ingested" : "pending")}>
                    <span className="sd" /> {s.status || "ingested"}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "research" && (
          <>
            <div className="composer" style={{ borderRadius: 16, margin: "18px 0 6px" }}>
              <textarea className="composer-input" rows={1} value={topic} placeholder="Dispatch a research run…"
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); research(); } }} />
              <div className="composer-bar">
                <div className="focus-pills"><button className="pill on">Web</button></div>
                <div className="composer-actions">
                  <button className="send" onClick={research} disabled={searching}>
                    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="13" x2="8" y2="3" /><path d="M4 7l4-4 4 4" /></svg>
                  </button>
                </div>
              </div>
            </div>
            {searching && <p className="page-sub" style={{ margin: "14px 4px" }}>Searching the open web…</p>}
            <div style={{ marginTop: 14 }}>
              {results.map((r, i) => {
                const rel = r.relevance ?? 0;
                const relClass = rel >= 90 ? "hi" : rel >= 80 ? "md" : "lo";
                return (
                  <div key={i} className="find">
                    <div className="find-top">
                      <span className="find-fav" style={{ background: hueColor(r.domain || r.title) }}>{initialOf(r.domain || r.title)}</span>
                      <div className="find-main">
                        <div className="find-title">{r.title}</div>
                        <div className="find-meta"><span>{r.domain}</span>{r.author && <><span className="d" /><span>{r.author}</span></>}{r.type && <><span className="d" /><span>{r.type}</span></>}</div>
                      </div>
                      {rel > 0 && <span className={`rel ${relClass}`}>{rel}%</span>}
                    </div>
                    {r.summary && <div className="find-summary">{r.summary}</div>}
                    {!!(r.tags && r.tags.length) && <div className="find-tags">{r.tags!.map((t) => <span key={t} className="ftag">{t}</span>)}</div>}
                    <div className="find-actions">
                      <button className="fbtn approve" onClick={() => addToast({ type: "success", title: "Approved", description: "Ingesting into wiki" })}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3,8 7,12 13,4" /></svg> Approve
                      </button>
                      {r.url && <a className="fbtn preview" href={r.url} target="_blank" rel="noreferrer">Open</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
