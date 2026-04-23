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
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";
import { QuickGenerateModal } from "@/components/editorial/quick-generate";

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
  updatedAt?: string;
}

interface WikiIndexEntry {
  title: string;
  type: string;
  tags: string[];
  slug: string;
  filePath: string;
  updatedAt: string;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TYPE_ORDER = ["synthesis", "concept", "entity", "source", "comparison", "query", "output"];
const TYPE_LABEL: Record<string, string> = {
  synthesis: "Synthesis",
  concept: "Concepts",
  entity: "Entities",
  source: "Sources",
  comparison: "Comparisons",
  query: "Queries",
  output: "Outputs",
  unknown: "Other",
};

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

type SortKey = "recent" | "title" | "type";

function WikiPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject, projects } = useProject();
  const projectId = activeProject?.id ?? null;
  const slug = searchParams.get("slug");

  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [allPages, setAllPages] = useState<WikiIndexEntry[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Picker state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { onHover, onLeave, PreviewCard } = useWikiPreview(projectId);

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

  useEffect(() => {
    if (slug || projectId === null) return;
    let cancelled = false;
    fetch(`/api/wiki?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d: { pages: WikiIndexEntry[] }) => {
        if (!cancelled) {
          setAllPages((d.pages ?? []).filter((p) => !["index", "log"].includes(p.slug)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, projectId]);

  const go = useCallback(
    (target: string) => {
      const raw = target.split("|")[0].trim();
      const parts = raw.split("/");
      if (parts.length > 1) {
        const maybeProjectSlug = parts[0];
        const match = projects.find(
          (p) => p.slug === maybeProjectSlug || p.slug.endsWith(`/${maybeProjectSlug}`)
        );
        if (match) {
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

  // Picker: filtered + sorted pages
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allPages;
    if (typeFilter) list = list.filter((p) => p.type === typeFilter);
    if (q) {
      list = list.filter((p) => {
        const blob = `${p.title} ${p.slug} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        return blob.includes(q);
      });
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === "title") return a.title.localeCompare(b.title);
      if (sortKey === "type") {
        const ta = TYPE_ORDER.indexOf(a.type);
        const tb = TYPE_ORDER.indexOf(b.type);
        const ra = ta === -1 ? 99 : ta;
        const rb = tb === -1 ? 99 : tb;
        if (ra !== rb) return ra - rb;
        return a.title.localeCompare(b.title);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return sorted;
  }, [allPages, search, typeFilter, sortKey]);

  const grouped = useMemo(() => {
    // Group whenever the user hasn't actively filtered — regardless of sort.
    // This gives the picker its editorial "table of contents" feel every
    // time you land on /wiki without a type filter or search query.
    if (typeFilter || search) return null;
    const groups = new Map<string, WikiIndexEntry[]>();
    for (const t of TYPE_ORDER) groups.set(t, []);
    for (const p of filtered) {
      const key = TYPE_ORDER.includes(p.type) ? p.type : "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    // Sort each group by the chosen key (filtered[] is already globally
    // sorted, so each group's order is consistent with the dropdown).
    return Array.from(groups.entries()).filter(([, v]) => v.length > 0);
  }, [filtered, typeFilter, search]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPages) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
    return counts;
  }, [allPages]);

  // ── No slug: picker view ──────────────────────────────────────────
  if (!slug) {
    const renderRow = (p: WikiIndexEntry, i: number) => (
      <button key={p.slug} type="button" className="entry" onClick={() => go(p.slug)}>
        <span className="n">{(i + 1).toString().padStart(2, "0")}</span>
        <span className="entry-body">
          <span className="t">{p.title}</span>
          <span className="sub">
            {p.type} · {p.slug}
            {p.tags && p.tags.length > 0 ? ` · ${p.tags.slice(0, 3).join(" · ")}` : ""}
          </span>
        </span>
        <span className="when">{formatRev(p.updatedAt)}</span>
      </button>
    );

    return (
      <div className="pad">
        <EditorialBreadcrumbs tail="Index" />

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 300,
            fontSize: 84,
            letterSpacing: "-0.045em",
            lineHeight: 0.9,
            fontVariationSettings: '"opsz" 144',
            marginBottom: 10,
          }}
        >
          The{" "}
          <em
            style={{
              fontFamily: "var(--font-inst)",
              fontStyle: "italic",
              color: "var(--accent)",
              fontWeight: 400,
            }}
          >
            Wiki.
          </em>
        </h1>
        <div
          style={{
            fontFamily: "var(--font-inst)",
            fontStyle: "italic",
            fontSize: 18,
            color: "var(--ink-3)",
            marginBottom: 10,
          }}
        >
          {allPages.length} page{allPages.length === 1 ? "" : "s"} in {activeProject?.name ?? ""}.
        </div>

        <div className="picker-toolbar">
          <div className="picker-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="7" cy="7" r="5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" />
            </svg>
            <input
              type="text"
              placeholder="Search title, slug, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="clear" onClick={() => setSearch("")} aria-label="Clear search">
                ✕
              </button>
            )}
          </div>
          <div className="picker-types">
            <button type="button" className={typeFilter === "" ? "on" : ""} onClick={() => setTypeFilter("")}>
              All {allPages.length > 0 ? `· ${allPages.length}` : ""}
            </button>
            {TYPE_ORDER.map((t) => {
              const count = typeCounts.get(t) ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={t}
                  type="button"
                  className={typeFilter === t ? "on" : ""}
                  onClick={() => setTypeFilter(t)}
                >
                  {t} · {count}
                </button>
              );
            })}
          </div>
          <div className="picker-sort">
            <span>Sort</span>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="recent">Recent</option>
              <option value="title">Title</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="picker-empty">
            {search || typeFilter
              ? "No pages match the current filters."
              : "No pages in this project yet."}
          </div>
        ) : grouped ? (
          grouped.map(([type, pages]) => {
            const isOpen = !collapsed.has(type);
            return (
              <div key={type} className="picker-group">
                <button
                  type="button"
                  className="picker-group-head"
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(type)) next.delete(type);
                      else next.add(type);
                      return next;
                    })
                  }
                >
                  <span
                    className="chev-sm"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--ink-4)",
                      display: "inline-block",
                      transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 140ms",
                      marginRight: 4,
                    }}
                  >
                    ▾
                  </span>
                  <span className="lab">
                    <em>{TYPE_LABEL[type] ?? type}</em>
                  </span>
                  <span className="c">{pages.length}</span>
                </button>
                {isOpen && pages.map((p, i) => renderRow(p, i))}
              </div>
            );
          })
        ) : (
          filtered.map(renderRow)
        )}
      </div>
    );
  }

  // ── Slug present: article view ────────────────────────────────────
  if (loading && !page) {
    return (
      <div className="pad" style={{ paddingTop: 60 }}>
        <div style={{ fontFamily: "var(--font-inst)", fontStyle: "italic", fontSize: 18, color: "var(--ink-3)" }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="pad" style={{ paddingTop: 60 }}>
        <EditorialBreadcrumbs showBack tail="Not found" />
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 32, color: "var(--ink)", marginBottom: 10 }}>
          Page not found.
        </div>
        <button className="btn sm ghost" onClick={() => router.push("/wiki")}>
          ← Back to index
        </button>
      </div>
    );
  }

  const { lead, tail } = splitTitleOnLastWord(page.title);
  // Prefer the filesystem mtime when available — synthesis pages are written
  // entirely by the synthesis job and don't reliably update a meta.updatedAt,
  // so the mtime is the source of truth for "last refreshed".
  const revSource =
    page.updatedAt ??
    (page.meta.updatedAt as string | undefined) ??
    (page.meta.date as string | undefined);
  const revLabel = formatRev(revSource);
  const isSynthesis = page.type === "synthesis";
  const synthesisAbsolute = page.updatedAt
    ? new Date(page.updatedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const tagRow = (page.tags ?? []).slice(0, 2).join(" · ").toUpperCase();
  const deck = (page.meta.deck as string | undefined) ?? (page.meta.description as string | undefined) ?? null;
  const deckFallback =
    page.type && page.type !== "unknown" ? `A ${page.type} page in ${activeProject?.slug ?? ""}.` : null;

  return (
    <div className="pad">
      <EditorialBreadcrumbs showBack tail={page.type.toUpperCase()} />

      <div style={{ display: "flex", gap: 10, marginTop: 2, marginBottom: -8 }}>
        <button
          type="button"
          className="btn sm primary"
          onClick={() => setGenerateOpen(true)}
          title="Generate a report, deck, or one-pager from this project"
          style={{ marginLeft: "auto" }}
        >
          ✦ Generate output
        </button>
      </div>

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
          {revLabel && (
            <span
              className="rev"
              title={synthesisAbsolute ?? undefined}
            >
              {isSynthesis ? "Updated" : "Rev"} · {revLabel}
            </span>
          )}
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

      {page.type === "output" && projectId && (() => {
        const baseName = page.slug.split("/").pop() ?? page.slug;
        const href = (ext: string, forceDownload = false) =>
          `/api/projects/${projectId}/outputs/download?file=${encodeURIComponent(baseName + "." + ext)}${forceDownload ? "&download=1" : ""}`;
        const family = (page.meta.output_type as string | undefined) ?? "";
        const derived =
          family === "deck"
            ? ["md", "pdf", "pptx"]
            : family === "infographic"
              ? ["html", "png"]
              : family === "report" || family === "summary" || family === "cheat"
                ? ["md", "docx"]
                : ["md", "docx", "pdf", "pptx", "html", "png"];
        return (
          <>
            {/* Infographic preview: inline PNG + open-HTML button. Clicking
                the PNG opens the full interactive HTML in a new tab. */}
            {family === "infographic" && (
              <div
                style={{
                  padding: "16px 0",
                  borderBottom: "1px dashed var(--rule-faint)",
                  marginBottom: 12,
                }}
              >
                <a
                  href={href("html")}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="Click to open the interactive HTML in a new tab"
                  style={{ display: "block" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={href("png")}
                    alt={page.title}
                    style={{
                      width: "100%",
                      maxWidth: 900,
                      border: "1.5px solid var(--ink)",
                      boxShadow: "6px 6px 0 var(--ink)",
                      display: "block",
                    }}
                  />
                </a>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <a
                    className="btn sm primary"
                    href={href("html")}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open interactive HTML ↗
                  </a>
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                padding: "16px 0 4px",
                borderBottom: "1px dashed var(--rule-faint)",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-4)",
                  alignSelf: "center",
                  marginRight: 8,
                }}
              >
                Download
              </span>
              {derived.map((ext) => (
                <a
                  key={ext}
                  className="btn sm ghost"
                  href={href(ext, true)}
                  style={{ textTransform: "uppercase" }}
                >
                  {ext}
                </a>
              ))}
            </div>
          </>
        );
      })()}

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
                    <span className="p" style={{ display: "block" }}>
                      {b.projectSlug}
                    </span>
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
                <button key={s} type="button" className="bklink" onClick={() => go(s)}>
                  <span>
                    <span className="t">{s.split("/").pop()?.replace(/-/g, " ")}</span>
                    <span className="p" style={{ display: "block" }}>
                      {s}
                    </span>
                  </span>
                  <span className="n">→</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rail">
          {page.type.toUpperCase()} · {activeProject?.slug?.toUpperCase() ?? ""}
        </div>
      </div>

      <PreviewCard />

      <QuickGenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        seedNudge={page.title}
      />
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
