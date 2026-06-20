"use client";

import { useEffect, useMemo, useState } from "react";
import { MarkdownBody, type RenderOpts } from "@/components/editorial/wiki/markdown-renderer";
import { cx, useProjectId } from "../lib";
import type { WikiPageFull, WikiPageMeta } from "../types";

export function WikiView() {
  const projectId = useProjectId();
  const [pages, setPages] = useState<WikiPageMeta[]>([]);
  const [query, setQuery] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [page, setPage] = useState<WikiPageFull | null>(null);

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
      .then((d: WikiPageFull) => { if (!cancelled) setPage(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, projectId]);

  const filtered = useMemo(
    () => pages.filter((p) => !query || p.title.toLowerCase().includes(query.toLowerCase())),
    [pages, query],
  );

  const openTarget = (target: string) => {
    const hit = pages.find((p) => p.slug === target || p.title.toLowerCase() === target.toLowerCase()
      || p.slug.toLowerCase().endsWith("/" + target.toLowerCase()));
    if (hit) setSlug(hit.slug);
  };
  const opts: RenderOpts = { onWikilinkClick: openTarget, onWikilinkHover: () => {}, onWikilinkLeave: () => {} };
  const current = page && page.slug === slug ? page : null;

  return (
    <section className="view active">
      <div className="wiki-layout">
        <div className="wiki-list">
          <input className="wiki-search" placeholder={`Search ${pages.length} pages…`} value={query} onChange={(e) => setQuery(e.target.value)} />
          {filtered.length === 0 && <div className="empty" style={{ padding: "24px 8px" }}><div className="et" style={{ fontSize: 13 }}>No pages found</div></div>}
          {filtered.map((p) => (
            <div key={p.slug} className={cx("wiki-link", p.slug === slug && "active")} onClick={() => setSlug(p.slug)}>
              <span className="wd" />{p.title}
            </div>
          ))}
        </div>

        <article className="wiki-article">
          {!current && <div className="empty"><div className="et">{slug !== null ? "Loading…" : "Select a page"}</div></div>}
          {current && (
            <>
              <div className="breadcrumb"><span>Wiki</span><span className="sep">/</span><span>{current.type}</span><span className="sep">/</span><span>{current.title}</span></div>
              <h1 className="wiki-h1">{current.title}</h1>
              <div className="wiki-metarow">
                <span>{current.type}</span>
                {current.updatedAt && <><span style={{ color: "var(--text-4)" }}>·</span><span>Updated {new Date(current.updatedAt).toLocaleDateString()}</span></>}
              </div>
              <div className="wiki-body">
                <MarkdownBody body={current.body} opts={opts} />
              </div>
              {!!(current.backlinks && current.backlinks.length) && (
                <div className="backlinks">
                  <div className="backlinks-h">Linked from</div>
                  {current.backlinks!.map((b) => (
                    <div key={b.slug} className="backlink" onClick={() => openTarget(b.slug)}>
                      <div><div className="bt">{b.title}</div><div className="bs">{b.projectSlug || ""}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </article>
      </div>
    </section>
  );
}
