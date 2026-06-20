"use client";

import { useEffect, useMemo, useState } from "react";
import { MarkdownBody, extractHeadings, type RenderOpts } from "@/components/editorial/wiki/markdown-renderer";
import { cx, useProjectId } from "../lib";
import type { WikiPageFull, WikiPageMeta } from "../types";

const TYPE_ORDER = ["synthesis", "concept", "entity", "source", "comparison", "query", "output"];
const TYPE_LABEL: Record<string, string> = {
  synthesis: "Synthesis", concept: "Concepts", entity: "Entities", source: "Sources",
  comparison: "Comparisons", query: "Queries", output: "Outputs", unknown: "Other",
};
type SortMode = "recent" | "title" | "type";

function when(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WikiView() {
  const projectId = useProjectId();
  const [pages, setPages] = useState<WikiPageMeta[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [slug, setSlug] = useState<string | null>(null);
  const [page, setPage] = useState<WikiPageFull | null>(null);
  const [activeHeading, setActiveHeading] = useState<string>("");

  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    fetch(`/api/wiki?projectId=${projectId}`).then((r) => r.json())
      .then((d: { pages?: WikiPageMeta[] }) => {
        if (cancelled) return;
        const list = d.pages ?? [];
        setPages(list);
        setSlug((cur) => cur ?? list[0]?.slug ?? null);
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (slug === null || projectId === null) return;
    let cancelled = false;
    fetch(`/api/wiki/${encodeURIComponent(slug)}?projectId=${projectId}`).then((r) => r.json())
      .then((d: WikiPageFull) => { if (!cancelled) setPage(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [slug, projectId]);

  // counts per type
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of pages) m[p.type] = (m[p.type] ?? 0) + 1;
    return m;
  }, [pages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pages.filter((p) =>
      (!typeFilter || p.type === typeFilter) &&
      (!q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))));
    if (sort === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "type") list = [...list].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.title.localeCompare(b.title));
    else list = [...list].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return list;
  }, [pages, query, typeFilter, sort]);

  // grouped only when no filter and no search
  const grouped = useMemo(() => {
    if (typeFilter || query.trim()) return null;
    const groups = new Map<string, WikiPageMeta[]>();
    for (const t of TYPE_ORDER) groups.set(t, []);
    for (const p of filtered) {
      const key = TYPE_ORDER.includes(p.type) ? p.type : "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries()).filter(([, v]) => v.length > 0);
  }, [filtered, typeFilter, query]);

  const toggle = (t: string) => setCollapsed((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const openTarget = (target: string) => {
    const hit = pages.find((p) => p.slug === target || p.title.toLowerCase() === target.toLowerCase()
      || p.slug.toLowerCase().endsWith("/" + target.toLowerCase()));
    if (hit) setSlug(hit.slug);
  };
  const opts: RenderOpts = { onWikilinkClick: openTarget, onWikilinkHover: () => {}, onWikilinkLeave: () => {} };
  const current = page && page.slug === slug ? page : null;

  // byline + TOC for the open page
  const headings = useMemo(() => (current ? extractHeadings(current.body).filter((h) => h.level === 2) : []), [current]);
  const wordCount = useMemo(() => (current ? current.body.replace(/[#*`>\-\[\]]/g, " ").split(/\s+/).filter(Boolean).length : 0), [current]);
  const outLinks = useMemo(() => (current ? new Set((current.body.match(/\[\[([^\]]+)\]\]/g) || [])).size : 0), [current]);
  const readMin = Math.max(1, Math.round(wordCount / 220));

  const entry = (p: WikiPageMeta, i: number) => (
    <button key={p.slug} type="button" className={cx("wk-entry", p.slug === slug && "active")} onClick={() => setSlug(p.slug)}>
      <span className="n">{String(i + 1).padStart(2, "0")}</span>
      <span className="wk-body">
        <span className="t">{p.title}</span>
        <span className="sub">{p.type}{p.tags && p.tags.length ? ` · ${p.tags.slice(0, 2).join(" · ")}` : ""}</span>
      </span>
      <span className="when">{when(p.updatedAt)}</span>
    </button>
  );

  return (
    <section className="view active">
      <div className="wiki-layout">
        {/* LIST PANE */}
        <div className="wiki-list">
          <div className="wiki-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text-3)" strokeWidth={1.6}><circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" /></svg>
            <input placeholder="Search title, slug, tag…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button className="clear" onClick={() => setQuery("")}>✕</button>}
          </div>

          <div className="wiki-chips">
            <button className={cx("wk-chip", !typeFilter && "on")} onClick={() => setTypeFilter("")}>All · {pages.length}</button>
            {TYPE_ORDER.filter((t) => typeCounts[t]).map((t) => (
              <button key={t} className={cx("wk-chip", typeFilter === t && "on")} onClick={() => setTypeFilter(typeFilter === t ? "" : t)}>
                {TYPE_LABEL[t]} · {typeCounts[t]}
              </button>
            ))}
          </div>

          <div className="wiki-sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
              <option value="recent">Recent</option>
              <option value="title">Title</option>
              <option value="type">Type</option>
            </select>
          </div>

          <div className="wiki-scroll">
            {filtered.length === 0 && <div className="wk-empty">No pages match the current filters.</div>}
            {grouped
              ? grouped.map(([type, ps]) => {
                  const open = !collapsed.has(type);
                  return (
                    <div key={type} className="wk-group">
                      <button className="wk-group-head" onClick={() => toggle(type)}>
                        <span className={cx("chev", !open && "closed")}>▾</span>
                        <span className="lab">{TYPE_LABEL[type] ?? type}</span>
                        <span className="c">{ps.length}</span>
                      </button>
                      {open && ps.map((p, i) => entry(p, i))}
                    </div>
                  );
                })
              : filtered.map((p, i) => entry(p, i))}
          </div>
        </div>

        {/* ARTICLE PANE */}
        <article className="wiki-article">
          {!current && <div className="wk-empty" style={{ padding: 40 }}>{slug !== null ? "Loading…" : "Select a page"}</div>}
          {current && (
            <>
              <div className="breadcrumb"><span>Wiki</span><span className="sep">/</span><span>{TYPE_LABEL[current.type] ?? current.type}</span><span className="sep">/</span><span>{current.title}</span></div>
              <h1 className="wiki-h1">{current.title}</h1>

              <div className="byline">
                <div className="bl"><span className="bk">Words</span><span className="bv">{wordCount.toLocaleString()}</span></div>
                <div className="bl"><span className="bk">Read</span><span className="bv">{readMin} min</span></div>
                <div className="bl"><span className="bk">Backlinks</span><span className="bv">{current.backlinks?.length ?? 0}</span></div>
                <div className="bl"><span className="bk">Links</span><span className="bv">{outLinks}</span></div>
                <div className="bl"><span className="bk">Type</span><span className="bv" style={{ textTransform: "capitalize" }}>{current.type}</span></div>
                <div className="bl"><span className="bk">Updated</span><span className="bv">{when(current.updatedAt) || "—"}</span></div>
              </div>

              <div className="wiki-cols">
                <div className="wiki-body">
                  <MarkdownBody body={current.body} opts={opts} />
                </div>

                <aside className="wiki-aside">
                  {headings.length > 0 && (
                    <div className="wk-card">
                      <h4>Contents</h4>
                      {headings.map((h, i) => (
                        <button key={h.id} className={cx("toc-item", activeHeading === h.id && "act")}
                          onClick={() => { setActiveHeading(h.id); document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                          <span className="n">§ {String(i + 1).padStart(2, "0")}</span>
                          <span className="x">{h.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!!(current.backlinks && current.backlinks.length) && (
                    <div className="wk-card">
                      <h4>Backlinks</h4>
                      {current.backlinks!.slice(0, 8).map((b) => (
                        <button key={b.slug} className="bklink" onClick={() => openTarget(b.slug)}>
                          <span className="t">{b.title}</span><span className="arr">→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
