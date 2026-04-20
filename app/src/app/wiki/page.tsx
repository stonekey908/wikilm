"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import {
  MarkdownBody,
  extractHeadings,
  type Heading,
  type RenderOpts,
} from "@/components/editorial/wiki/markdown-renderer";
import { useWikiPreview } from "@/components/editorial/wiki/wiki-preview";

interface Backlink {
  slug: string;
  title: string;
  projectId: number;
  projectSlug: string;
}

interface WikiPage {
  slug: string;
  title: string;
  type: string;
  tags: string[];
  meta: Record<string, unknown>;
  body: string;
  backlinks: Backlink[];
}

interface WikiIndexEntry {
  title: string;
  type: string;
  slug: string;
  updatedAt: string;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatRev(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function readTime(wordCount: number): string {
  const minutes = Math.max(1, Math.round(wordCount / 250));
  return `${minutes} min`;
}

function countWords(body: string): number {
  return body
    .replace(/^---[\s\S]*?---\n/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*`_#>[\]()]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function splitTitleOnLastWord(title: string): { lead: string; tail: string } {
  const parts = title.trim().split(/\s+/);
  if (parts.length <= 1) return { lead: "", tail: title };
  return { lead: parts.slice(0, -1).join(" ") + " ", tail: parts[parts.length - 1] };
}

function extractSources(body: string): string[] {
  const out = new Set<string>();
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const raw = m[1];
    const target = raw.split("|")[0].trim();
    if (target.toLowerCase().startsWith("sources/") || target.toLowerCase().includes("/sources/")) {
      out.add(target);
    }
  }
  return Array.from(out);
}

function WikiPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject, projects } = useProject();
  const projectId = activeProject?.id ?? null;
  const slug = searchParams.get("slug");

  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [allPages, setAllPages] = useState<WikiIndexEntry[]>([]);

  const { onHover, onLeave, PreviewCard } = useWikiPreview(projectId);

  // Fetch article when slug changes
  useEffect(() => {
    if (!slug || projectId === null) {
      setPage(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/wiki/${encodeURIComponent(slug)}?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: WikiPage) => {
        if (!cancelled) setPage(d);
      })
      .catch(() => {
        if (!cancelled) setPage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, projectId]);

  // Fetch page index when no slug — for the picker mode
  useEffect(() => {
    if (slug || projectId === null) return;
    let cancelled = false;
    fetch(`/api/wiki?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d: { pages: WikiIndexEntry[] }) => {
        if (!cancelled) {
          setAllPages(
            (d.pages ?? [])
              .filter((p) => !["index", "log"].includes(p.slug))
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, projectId]);

  const go = useCallback(
    (target: string) => {
      // Target might be "slug", "slug|display", "project/slug"
      const raw = target.split("|")[0].trim();
      // If it starts with a known project slug, switch project + navigate
      const parts = raw.split("/");
      if (parts.length > 1) {
        const maybeProjectSlug = parts[0];
        const match = projects.find(
          (p) => p.slug === maybeProjectSlug || p.slug.endsWith(`/${maybeProjectSlug}`)
        );
        if (match) {
          // switch to that project and navigate to the sub-path
          const subSlug = parts.slice(1).join("/");
          router.push(`/wiki?slug=${encodeURIComponent(subSlug)}`);
          return;
        }
      }
      router.push(`/wiki?slug=${encodeURIComponent(raw)}`);
    },
    [router, projects]
  );

  const renderOpts: RenderOpts = useMemo(
    () => ({
      onWikilinkClick: go,
      onWikilinkHover: onHover,
      onWikilinkLeave: onLeave,
    }),
    [go, onHover, onLeave]
  );

  const headings: Heading[] = useMemo(
    () => (page ? extractHeadings(page.body).filter((h) => h.level === 2) : []),
    [page]
  );

  const sources = useMemo(() => (page ? extractSources(page.body) : []), [page]);
  const wordCount = useMemo(() => (page ? countWords(page.body) : 0), [page]);

  // ── No slug: page picker view ──────────────────────────────────
  if (!slug) {
    return (
      <div className="pad" style={{ paddingTop: 36 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "calc(10.5px * var(--fs-scale, 1))",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-4)",
            marginBottom: 18,
          }}
        >
          Section 02 · The Wiki
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 300,
            fontSize: "calc(84px * var(--fs-scale, 1))",
            letterSpacing: "-0.045em",
            lineHeight: 0.9,
            fontVariationSettings: '"opsz" 144',
            marginBottom: 28,
          }}
        >
          The <em style={{ fontFamily: "var(--font-inst)", fontStyle: "italic", color: "var(--accent)", fontWeight: 400 }}>Wiki.</em>
        </h1>
        <div
          style={{
            borderTop: "2.5px solid var(--rule)",
            paddingTop: 18,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-inst)",
              fontStyle: "italic",
              fontSize: "calc(18px * var(--fs-scale, 1))",
              color: "var(--ink-3)",
              marginBottom: 18,
            }}
          >
            Pick a page, or jump to one from the Ledger.
          </div>
          {allPages.length === 0 ? (
            <div style={{ fontFamily: "var(--font-inst)", fontStyle: "italic", fontSize: "calc(13px * var(--fs-scale, 1))", color: "var(--ink-3)" }}>
              No pages in this project yet.
            </div>
          ) : (
            allPages.slice(0, 30).map((p, i) => (
              <button
                key={p.slug}
                type="button"
                className="entry"
                onClick={() => go(p.slug)}
              >
                <span className="n">{(i + 1).toString().padStart(2, "0")}</span>
                <span className="entry-body">
                  <span className="t">{p.title}</span>
                  <span className="sub">
                    {p.type} · {p.slug}
                  </span>
                </span>
                <span className="when">{formatRev(p.updatedAt)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Slug present: article view ──────────────────────────────────
  if (loading && !page) {
    return (
      <div className="pad" style={{ paddingTop: 60 }}>
        <div
          style={{
            fontFamily: "var(--font-inst)",
            fontStyle: "italic",
            fontSize: "calc(18px * var(--fs-scale, 1))",
            color: "var(--ink-3)",
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="pad" style={{ paddingTop: 60 }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "calc(32px * var(--fs-scale, 1))",
            color: "var(--ink)",
            marginBottom: 10,
          }}
        >
          Page not found.
        </div>
        <button
          className="btn sm ghost"
          onClick={() => router.push("/wiki")}
        >
          ← Back to index
        </button>
      </div>
    );
  }

  const { lead, tail } = splitTitleOnLastWord(page.title);
  const revLabel = formatRev((page.meta.updatedAt as string | undefined) ?? (page.meta.date as string | undefined));
  const tagRow = (page.tags ?? []).slice(0, 2).join(" · ").toUpperCase();
  const deck = (page.meta.deck as string | undefined) ?? (page.meta.description as string | undefined) ?? null;
  const deckFallback = page.type && page.type !== "unknown" ? `A ${page.type} page in ${activeProject?.slug ?? ""}.` : null;

  return (
    <div className="pad">
      <div className="art-masthead">
        <div className="kicker">
          <span className="path">{activeProject?.slug ?? ""}</span>
          <span>·</span>
          <span>{page.type.toUpperCase()}</span>
          {tagRow && (
            <>
              <span>·</span>
              <span>{tagRow}</span>
            </>
          )}
          {revLabel && <span className="rev">Rev · {revLabel}</span>}
        </div>
        <h1>
          {lead}
          <em>{tail}</em>
        </h1>
        {(deck || deckFallback) && <div className="deck">{deck || deckFallback}</div>}
      </div>

      <div className="byline-strip">
        <div>
          Words
          <span className="v">{wordCount.toLocaleString()}</span>
        </div>
        <div>
          Read
          <span className="v">{readTime(wordCount)}</span>
        </div>
        <div>
          Backlinks
          <span className="v">{page.backlinks.length}</span>
        </div>
        <div>
          Sources
          <span className="v">{sources.length}</span>
        </div>
        <div>
          Type
          <span className="v">{page.type}</span>
        </div>
        <div>
          Updated
          <span className="v">{revLabel || "—"}</span>
        </div>
      </div>

      <div className="article">
        <MarkdownBody body={page.body} opts={renderOpts} />

        <div className="margin">
          {headings.length > 0 && (
            <div className="card">
              <h4>Contents</h4>
              {headings.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="toc-item"
                  onClick={() => {
                    const el = document.getElementById(h.id);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span className="n">{h.section}</span>
                  <span>{h.text}</span>
                </button>
              ))}
            </div>
          )}

          {page.backlinks.length > 0 && (
            <div className="card">
              <h4>Backlinks</h4>
              {page.backlinks.slice(0, 8).map((b) => (
                <button
                  key={`${b.projectId}-${b.slug}`}
                  type="button"
                  className="bklink"
                  onClick={() => router.push(`/wiki?slug=${encodeURIComponent(b.slug)}`)}
                >
                  <span>
                    <span className="t">{b.title}</span>
                    <span className="p" style={{ display: "block" }}>{b.projectSlug}</span>
                  </span>
                  <span className="n">→</span>
                </button>
              ))}
            </div>
          )}

          {sources.length > 0 && (
            <div className="card">
              <h4>Sources</h4>
              {sources.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="bklink"
                  onClick={() => go(s)}
                >
                  <span>
                    <span className="t">{s.split("/").pop()?.replace(/-/g, " ")}</span>
                    <span className="p" style={{ display: "block" }}>{s}</span>
                  </span>
                  <span className="n">→</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rail">{page.type.toUpperCase()} · {activeProject?.slug?.toUpperCase() ?? ""}</div>
      </div>

      <PreviewCard />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WikiPageInner />
    </Suspense>
  );
}
