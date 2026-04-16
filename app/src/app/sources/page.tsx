"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ──────────────────────────── Types ──────────────────────────── */

interface Source {
  id: number;
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
  ingestProgress?: { current: number; total: number };
}

/* ──────────────────────── Helper: SVG icons ──────────────────── */

function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="6.5" cy="6.5" r="5" />
      <line x1="10.5" y1="10.5" x2="15" y2="15" />
    </svg>
  );
}

function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3,8 7,12 13,4" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 2h10v13l-5-3.5L3 15V2z" />
    </svg>
  );
}

function CrossProjectIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="6" cy="6" r="5" />
      <circle cx="11" cy="11" r="5" />
    </svg>
  );
}

/* ──────────────────────────── Page ──────────────────────────── */

export default function SourcesPage() {
  const [tab, setTab] = useState<"library" | "research">("library");
  const [sources, setSources] = useState<Source[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [researchQuery, setResearchQuery] = useState("");
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextResultId = useRef(0);

  /* ── Fetch sources (poll while any are ingesting) ── */
  useEffect(() => {
    const fetchSources = () => {
      fetch("/api/sources")
        .then((r) => r.json())
        .then((d) => setSources(d.sources ?? []))
        .catch(() => {});
    };
    fetchSources();
    const interval = setInterval(fetchSources, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ── Research stream ── */
  const startResearch = useCallback(async () => {
    if (!researchQuery.trim() || isSearching) return;

    setResults([]);
    setIsSearching(true);
    nextResultId.current = 0;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/sources/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: researchQuery }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setIsSearching(false);
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
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "content") {
              const text: string = evt.text;
              // Check for RESULT: lines
              if (text.startsWith("RESULT:")) {
                try {
                  const json = JSON.parse(text.slice(7));
                  const result: ResearchResult = {
                    id: `r${nextResultId.current++}`,
                    title: json.title ?? "Untitled",
                    url: json.url ?? "",
                    domain: json.domain ?? "",
                    author: json.author ?? "Unknown",
                    type: json.type ?? "Article",
                    summary: json.summary ?? "",
                    relevance: json.relevance ?? 50,
                    tags: json.tags ?? [],
                    status: "pending",
                  };
                  setResults((prev) => [...prev, result]);
                } catch {
                  // malformed JSON line, skip
                }
              } else if (text.trim() === "DONE") {
                setIsSearching(false);
              }
            } else if (evt.type === "done") {
              setIsSearching(false);
            }
          } catch {
            // malformed SSE payload, skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // user cancelled
      }
    } finally {
      setIsSearching(false);
      abortRef.current = null;
    }
  }, [researchQuery, isSearching]);

  const cancelResearch = useCallback(() => {
    abortRef.current?.abort();
    setIsSearching(false);
  }, []);

  /* ── Refresh sources helper ── */
  const refreshSources = useCallback(async () => {
    const d = await fetch("/api/sources").then((r) => r.json());
    setSources(d.sources ?? []);
  }, []);

  /* ── Delete source ── */
  const deleteSource = useCallback(async (id: number) => {
    if (!confirm("Delete this source and its raw file?")) return;
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (res.ok) refreshSources();
  }, [refreshSources]);

  /* ── Trigger ingest on pending source ── */
  const triggerIngest = useCallback(async (id: number) => {
    await fetch(`/api/sources/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ingest" }),
    });
    refreshSources();
  }, [refreshSources]);

  /* ── Upload handler ── */
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    const res = await fetch("/api/sources/upload", {
      method: "POST",
      body: fd,
    });
    if (res.ok) refreshSources();
  }, [refreshSources]);

  /* ── Drag & drop ── */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    },
    [uploadFiles]
  );

  /* ── Research result actions ── */
  const setResultStatus = useCallback(
    async (id: string, status: ResearchResult["status"]) => {
      setResults((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                ...(status === "approved"
                  ? { ingestProgress: { current: 0, total: 12 } }
                  : {}),
              }
            : r
        )
      );

      if (status === "approved") {
        const result = results.find((r) => r.id === id);
        if (!result) return;

        try {
          await fetch("/api/claude/job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: 1,
              type: "ingest",
              title: `Ingest: ${result.title}`,
              prompt: `Fetch and ingest the following source into the wiki:\n\nTitle: ${result.title}\nDomain: ${result.domain}\nAuthor: ${result.author}\nType: ${result.type}\nSummary: ${result.summary}\nTags: ${result.tags.join(", ")}\n\nSearch the web for this source, download or read its content, create a source summary in wiki/sources/, identify entities and concepts, update existing wiki pages with cross-references, and update wiki/index.md and wiki/log.md.`,
            }),
          });
        } catch {
          // job submission failed — leave the UI as approved
        }
      }
    },
    [results]
  );

  const approvedCount = results.filter((r) => r.status === "approved").length;
  const foundCount = results.length;

  /* ── Relevance badge class ── */
  const relClass = (pct: number) => {
    if (pct >= 90) return "bg-[var(--green-dim)] text-[var(--green)]";
    if (pct >= 80) return "bg-[var(--blue-dim)] text-[var(--blue)]";
    return "bg-[var(--bg-2)] text-[var(--text-3)]";
  };

  /* ── Type dot color ── */
  const typeDotColor = (type: string) => {
    if (type === "pdf") return "var(--red)";
    if (type === "web") return "var(--blue)";
    return "var(--orange)";
  };

  return (
    <div className="p-8 max-w-[960px]">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
            Sources
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-1">
            Manage raw materials and discover new sources
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-[var(--text-3)] bg-[var(--bg-2)] border border-[var(--border)] px-3 py-1.5 rounded-md cursor-pointer transition-all hover:border-[var(--primary)] hover:text-[var(--primary)] shrink-0 mt-0.5">
          <CrossProjectIcon />
          Cross-project search
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-[var(--border)] mb-6">
        <button
          onClick={() => setTab("library")}
          className={`px-4 py-2 text-[13px] font-medium cursor-pointer border-b-2 -mb-px transition-all ${
            tab === "library"
              ? "text-[var(--text-1)] border-[var(--primary)]"
              : "text-[var(--text-3)] border-transparent hover:text-[var(--text-2)]"
          }`}
        >
          Library{" "}
          <span
            className={`font-mono text-[11px] ml-1 ${
              tab === "library"
                ? "text-[var(--primary)]"
                : "text-[var(--text-4)]"
            }`}
          >
            {sources.length}
          </span>
        </button>
        <button
          onClick={() => setTab("research")}
          className={`px-4 py-2 text-[13px] font-medium cursor-pointer border-b-2 -mb-px transition-all ${
            tab === "research"
              ? "text-[var(--text-1)] border-[var(--primary)]"
              : "text-[var(--text-3)] border-transparent hover:text-[var(--text-2)]"
          }`}
        >
          Research{" "}
          <span
            className={`font-mono text-[11px] ml-1 ${
              tab === "research"
                ? "text-[var(--primary)]"
                : "text-[var(--text-4)]"
            }`}
          >
            {results.length}
          </span>
        </button>
      </div>

      {/* ═══════════ LIBRARY TAB ═══════════ */}
      {tab === "library" && (
        <div>
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-[1.5px] border-dashed rounded-lg py-7 text-center text-[13px] cursor-pointer transition-all mb-5 ${
              dragOver
                ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--text-2)]"
                : "border-[var(--border-strong)] text-[var(--text-3)] hover:border-[var(--primary)] hover:bg-[var(--primary-dim)] hover:text-[var(--text-2)]"
            }`}
          >
            <div className="text-xl mb-1.5 opacity-40">+</div>
            Drop files here or click to upload
            <div className="text-[11px] text-[var(--text-4)] mt-1">
              PDF, Markdown, Text, HTML
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.md,.txt,.html,.htm"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
              }}
            />
          </div>

          {/* Source cards grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
            {sources.map((s) => (
              <div
                key={s.id}
                className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg px-4 py-3.5 transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] group relative"
              >
                {/* Delete button */}
                <button
                  onClick={() => deleteSource(s.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[var(--text-4)] hover:text-[var(--red)] transition-all p-1"
                  title="Delete source"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
                <div className="font-mono text-[10px] font-medium uppercase tracking-wide text-[var(--text-4)] mb-1.5 flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: typeDotColor(s.type) }}
                  />
                  {s.type.toUpperCase()}
                </div>
                <div className="text-[13px] font-semibold text-[var(--text-1)] leading-snug mb-1">
                  {s.title}
                </div>
                <div className="text-[11px] text-[var(--text-3)]">
                  {s.author ?? s.meta ?? "Unknown"} &middot;{" "}
                  {new Date(s.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div
                  className={`flex items-center gap-1 mt-2 text-[11px] font-[550] ${
                    s.status === "ingested"
                      ? "text-[var(--green)]"
                      : s.status === "ingesting"
                        ? "text-[var(--primary)]"
                        : "text-[var(--orange)]"
                  }`}
                >
                  {s.status === "ingesting" ? (
                    <span className="inline-block w-[10px] h-[10px] border-[1.5px] border-[var(--border-strong)] border-t-[var(--primary)] rounded-full animate-spin" />
                  ) : (
                    <span className="w-[5px] h-[5px] rounded-full bg-current" />
                  )}
                  {s.status === "ingested" && (
                    <>Ingested &middot; {s.pageCount ?? 0} pages</>
                  )}
                  {s.status === "ingesting" && <>Ingesting...</>}
                  {s.status === "pending" && (
                    <button
                      onClick={() => triggerIngest(s.id)}
                      className="text-[var(--primary)] underline underline-offset-2 hover:text-[var(--primary-hover)] cursor-pointer"
                    >
                      Start ingestion
                    </button>
                  )}
                  {s.status === "failed" && (
                    <button
                      onClick={() => triggerIngest(s.id)}
                      className="text-[var(--red)] underline underline-offset-2 hover:text-[var(--text-2)] cursor-pointer"
                    >
                      Retry ingestion
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {sources.length === 0 && (
            <div className="text-center text-[var(--text-4)] text-sm py-12">
              No sources yet. Drop a file above to get started.
            </div>
          )}
        </div>
      )}

      {/* ═══════════ RESEARCH TAB ═══════════ */}
      {tab === "research" && (
        <div>
          {/* Search input */}
          <div className="flex gap-2 mb-5">
            <input
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") startResearch();
              }}
              placeholder="Enter a research topic..."
              className="flex-1 bg-[var(--bg-0)] border border-[var(--border-input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--ring)]"
            />
            <button
              onClick={startResearch}
              disabled={isSearching || !researchQuery.trim()}
              className="bg-[var(--primary)] text-[var(--primary-fg)] text-[13px] font-semibold px-[18px] py-2.5 border-none rounded-lg cursor-pointer flex items-center gap-1.5 transition-all whitespace-nowrap hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SearchIcon />
              {isSearching ? "Searching..." : "Research"}
            </button>
          </div>

          {/* Status bar */}
          {isSearching && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--primary-dim)] border border-[rgba(13,148,136,0.15)] rounded-lg mb-5 text-[13px] text-[var(--primary)]">
              <span className="inline-block w-3.5 h-3.5 border-2 border-[rgba(13,148,136,0.2)] border-t-[var(--primary)] rounded-full animate-spin shrink-0" />
              Searching and analyzing sources...
              <div className="flex-1 h-[3px] bg-[rgba(13,148,136,0.15)] rounded-sm overflow-hidden">
                <div className="h-full w-[65%] bg-[var(--primary)] rounded-sm" />
              </div>
              <button
                onClick={cancelResearch}
                className="text-[var(--text-3)] text-xs cursor-pointer underline underline-offset-2 shrink-0 hover:text-[var(--text-2)] bg-transparent border-none p-0"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Bulk actions bar */}
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-3)]">
            <span>
              <span className="font-semibold text-[var(--text-2)]">
                {foundCount}
              </span>{" "}
              found
            </span>
            <span className="opacity-30">&middot;</span>
            <span>
              <span className="font-semibold text-[var(--text-2)]">
                {approvedCount}
              </span>{" "}
              approved
            </span>
            <button className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-3)] cursor-pointer transition-all hover:border-[var(--border-strong)] hover:text-[var(--text-2)]">
              Skip remaining
            </button>
            <button className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-transparent bg-[var(--primary-dim)] text-[var(--primary)] cursor-pointer transition-all hover:bg-[rgba(13,148,136,0.15)]">
              Approve all
            </button>
          </div>

          {/* Results label */}
          <div className="text-xs font-semibold text-[var(--text-4)] uppercase tracking-wide mb-3">
            Discovered Sources
          </div>

          {/* Result cards */}
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <div
                key={r.id}
                className={`bg-[var(--surface-card)] border rounded-lg px-[18px] py-4 transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] ${
                  r.status === "approved"
                    ? "border-[rgba(22,163,74,0.2)]"
                    : "border-[var(--border)]"
                }`}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="text-sm font-semibold text-[var(--text-1)] leading-snug">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)] transition-colors">{r.title}</a>
                    ) : (
                      r.title
                    )}
                  </div>
                  <span
                    className={`font-mono text-[11px] font-medium px-[7px] py-0.5 rounded-[10px] shrink-0 ${relClass(r.relevance)}`}
                  >
                    {r.relevance}%
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs text-[var(--text-3)] mb-2">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{r.domain || r.url}</a>
                  ) : (
                    <span>{r.domain}</span>
                  )}
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--text-4)]" />
                  <span>{r.author}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--text-4)]" />
                  <span>{r.type}</span>
                </div>

                {/* Summary */}
                <div className="text-[13px] leading-relaxed text-[var(--text-2)] mb-3">
                  {r.summary}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {r.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--bg-2)] text-[var(--text-3)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Actions or approved bar */}
                {r.status === "approved" ? (
                  <div className="flex items-center gap-2 text-xs font-[550] text-[var(--green)] pt-3 border-t border-[var(--border)]">
                    <span className="inline-block w-3 h-3 border-[1.5px] border-[var(--green-dim)] border-t-[var(--green)] rounded-full animate-spin" />
                    Approved — ingesting into wiki
                    <span className="ml-auto font-mono text-[11px] text-[var(--text-3)]">
                      {r.ingestProgress?.current ?? 0} /{" "}
                      {r.ingestProgress?.total ?? 12} pages
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-1.5 pt-3 border-t border-[var(--border)]">
                    <button
                      onClick={() => setResultStatus(r.id, "approved")}
                      className="text-xs font-[550] px-3 py-[5px] rounded-md bg-[var(--green-dim)] text-[var(--green)] border-none cursor-pointer flex items-center gap-1 transition-all hover:bg-[rgba(22,163,74,0.15)]"
                    >
                      <CheckIcon /> Approve
                    </button>
                    <button
                      onClick={() => setResultStatus(r.id, "skipped")}
                      className="text-xs font-[550] px-3 py-[5px] rounded-md bg-transparent text-[var(--text-3)] border border-[var(--border)] cursor-pointer transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-2)]"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => setResultStatus(r.id, "bookmarked")}
                      className="text-xs font-[550] px-3 py-[5px] rounded-md bg-[var(--primary-dim)] text-[var(--primary)] border-none cursor-pointer flex items-center gap-1 transition-all hover:bg-[rgba(13,148,136,0.15)]"
                    >
                      <BookmarkIcon /> Bookmark
                    </button>
                    <button className="text-xs font-[550] px-3 py-[5px] rounded-md bg-transparent text-[var(--text-3)] border border-[var(--border)] cursor-pointer ml-auto transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-2)]">
                      Preview
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
