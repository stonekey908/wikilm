"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  FileText,
  User,
  Lightbulb,
  GitCompare,
  Layers,
  HelpCircle,
  BookOpen,
  ArrowLeft,
  Tag,
  Link2,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";

/* ─── Types ─── */

interface WikiPageMeta {
  title: string;
  type: string;
  tags: string[];
  slug: string;
  filePath: string;
  updatedAt?: string;
}

interface WikiPageDetail {
  slug: string;
  title: string;
  type: string;
  tags: string[];
  meta: Record<string, unknown>;
  body: string;
  backlinks: { slug: string; title: string }[];
}

/* ─── Constants ─── */

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string; dimColor: string }> = {
  source: { icon: BookOpen, label: "Source", color: "var(--blue)", dimColor: "var(--blue-dim)" },
  entity: { icon: User, label: "Entity", color: "var(--orange)", dimColor: "var(--orange-dim)" },
  concept: { icon: Lightbulb, label: "Concept", color: "var(--primary)", dimColor: "var(--primary-dim)" },
  comparison: { icon: GitCompare, label: "Comparison", color: "var(--chart-3)", dimColor: "rgba(99,102,241,0.08)" },
  synthesis: { icon: Layers, label: "Synthesis", color: "var(--chart-4)", dimColor: "rgba(139,92,246,0.08)" },
  query: { icon: HelpCircle, label: "Query", color: "var(--green)", dimColor: "var(--green-dim)" },
  index: { icon: FileText, label: "Index", color: "var(--text-3)", dimColor: "var(--bg-2)" },
  unknown: { icon: FileText, label: "Page", color: "var(--text-3)", dimColor: "var(--bg-2)" },
};

const ALL_TYPES = ["source", "entity", "concept", "comparison", "synthesis", "query"];

const SECTION_LABEL: Record<string, string> = {
  source: "Sources",
  entity: "Entities",
  concept: "Concepts",
  comparison: "Comparisons",
  synthesis: "Synthesis",
  query: "Queries",
};

/* ─── Markdown Renderer ─── */

// Extract headings (h1-h3) from markdown body with deterministic slug ids.
// Used by the TOC to build the outline and by the renderer to tag each heading.
function extractHeadings(body: string): { id: string; level: number; text: string }[] {
  const headings: { id: string; level: number; text: string }[] = [];
  const seen = new Map<string, number>();

  for (const line of body.split("\n")) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/[*`_]/g, "").trim();
    const base = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    headings.push({ id, level, text });
  }
  return headings;
}

/**
 * Section headings that flag "things we don't know yet" — when a research
 * callback is provided (i.e. we're rendering the synthesis page), each list
 * item under one of these headings gets a per-item "Research" button.
 */
const GAP_HEADING_REGEX = /(knowledge\s+gaps?|gaps?\b|open\s+questions?|what\s+we\s+don'?t\s+know)/i;

/** Strip wikilinks / markdown emphasis / links from a list item so the
 *  research topic is plain readable text. Conservative — leaves punctuation
 *  alone. */
function stripInlineMarkup(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function renderMarkdown(
  body: string,
  onLinkClick: (slug: string) => void,
  onResearchGap?: (topic: string) => void
): React.ReactNode[] {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  // Each item carries the inGaps flag captured at add-time so list boundaries
  // across section changes don't mis-tag items.
  let listItems: { text: string; inGaps: boolean }[] = [];
  let listType: "ul" | "ol" | null = null;
  let inGapsSection = false;

  // Pre-compute heading ids so in-page and TOC links stay in sync
  const headingIds = extractHeadings(body);
  let headingIdx = 0;

  function flushList() {
    if (listItems.length === 0) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag
        key={`list-${elements.length}`}
        className={`${listType === "ol" ? "list-decimal" : "list-disc"} pl-6 space-y-1 text-[14px] leading-relaxed text-[var(--text-2)]`}
      >
        {listItems.map((item, i) => (
          <li key={i}>
            {renderInline(item.text, onLinkClick)}
            {item.inGaps && onResearchGap && (
              <button
                onClick={() => onResearchGap(stripInlineMarkup(item.text))}
                className="ml-2 inline-flex items-center gap-1 text-[11px] font-[500] text-[var(--primary)] hover:underline align-middle"
                title="Research new sources to close this gap"
              >
                <Search className="w-3 h-3" />
                Research
              </button>
            )}
          </li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      // Track whether subsequent list items belong to a "gaps" section
      inGapsSection = Boolean(onResearchGap) && GAP_HEADING_REGEX.test(text);
      const sizes: Record<number, string> = {
        1: "text-[20px] font-[650] tracking-tight mt-6 mb-3 scroll-mt-6",
        2: "text-[17px] font-[620] tracking-tight mt-5 mb-2.5 scroll-mt-6",
        3: "text-[15px] font-[600] mt-4 mb-2 scroll-mt-6",
        4: "text-[14px] font-[580] mt-3 mb-1.5",
        5: "text-[13px] font-[560] mt-2 mb-1",
        6: "text-[13px] font-[540] mt-2 mb-1 text-[var(--text-2)]",
      };
      // Only h1-h3 get ids (matches extractHeadings); deeper headings render plainly
      const id = level <= 3 ? headingIds[headingIdx++]?.id : undefined;
      elements.push(
        <div key={i} id={id} className={sizes[level] || sizes[3]}>
          {renderInline(text, onLinkClick)}
        </div>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={i} className="border-[var(--border)] my-4" />);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (ulMatch) {
      if (listType === "ol") flushList();
      listType = "ul";
      listItems.push({ text: ulMatch[1], inGaps: inGapsSection });
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listType === "ul") flushList();
      listType = "ol";
      listItems.push({ text: olMatch[1], inGaps: inGapsSection });
      continue;
    }

    flushList();

    // Empty line
    if (line.trim() === "") {
      continue;
    }

    // Code block (simple inline approach, not full fenced blocks)
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="bg-[var(--bg-2)] border border-[var(--border)] rounded-md p-3 text-[13px] font-mono overflow-x-auto my-3 text-[var(--text-2)]"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const text = line.replace(/^>\s?/, "");
      elements.push(
        <blockquote
          key={i}
          className="border-l-2 border-[var(--primary)] pl-3 py-0.5 text-[14px] text-[var(--text-2)] italic my-2"
        >
          {renderInline(text, onLinkClick)}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-[14px] leading-relaxed text-[var(--text-2)] my-1.5">
        {renderInline(line, onLinkClick)}
      </p>
    );
  }

  flushList();
  return elements;
}

function renderInline(text: string, onLinkClick: (slug: string) => void): React.ReactNode {
  // Split on wikilinks, bold, italic, code, and regular links
  const parts: React.ReactNode[] = [];
  // Pattern: [[wikilink]], **bold**, *italic*, `code`, [text](url)
  const pattern = /(\[\[([^\]]+)\]\]|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      // [[wikilink]]
      const linkTarget = match[2];
      parts.push(
        <button
          key={`wl-${match.index}`}
          onClick={() => onLinkClick(linkTarget)}
          className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium underline decoration-[var(--primary)]/30 underline-offset-2 cursor-pointer transition-colors"
        >
          {linkTarget}
        </button>
      );
    } else if (match[3] !== undefined) {
      // **bold**
      parts.push(<strong key={`b-${match.index}`} className="font-[600] text-[var(--text-1)]">{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      // *italic*
      parts.push(<em key={`i-${match.index}`}>{match[4]}</em>);
    } else if (match[5] !== undefined) {
      // `code`
      parts.push(
        <code
          key={`c-${match.index}`}
          className="bg-[var(--bg-2)] px-1.5 py-0.5 rounded text-[13px] font-mono text-[var(--primary)]"
        >
          {match[5]}
        </code>
      );
    } else if (match[6] !== undefined && match[7] !== undefined) {
      // [text](url)
      parts.push(
        <a
          key={`a-${match.index}`}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] hover:text-[var(--primary-hover)] underline underline-offset-2"
        >
          {match[6]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/* ─── Helper Components ─── */

function TypeChip({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.unknown;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-[550]"
      style={{ color: cfg.color, background: cfg.dimColor }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

/* ─── Page Component ─── */

export default function WikiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pages, setPages] = useState<WikiPageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<WikiPageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  // Navigation trail: entries are { slug, title } in visit order. Empty array = no navigation yet.
  const [trail, setTrail] = useState<{ slug: string; title: string }[]>([]);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [tocExpanded, setTocExpanded] = useState(true);
  // Initial state: all sections collapsed. Rehydrated from localStorage on mount.
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(ALL_TYPES)
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Restore collapsed state on mount, persist on every change.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wikilm-wiki-collapsed");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setCollapsedSections(new Set(arr));
      }
    } catch {
      // localStorage unavailable or malformed — keep default (all collapsed)
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "wikilm-wiki-collapsed",
        JSON.stringify(Array.from(collapsedSections))
      );
    } catch {
      // storage quota or private mode — silently skip
    }
  }, [collapsedSections]);

  function toggleSection(type: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function expandAll() {
    setCollapsedSections(new Set());
  }

  function collapseAll() {
    setCollapsedSections(new Set(ALL_TYPES));
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch pages
  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/wiki?${params.toString()}`);
      const data = await res.json();
      setPages(data.pages);
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchPages, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchPages, search]);

  // If the URL has ?slug=..., auto-open that page (used by the graph view).
  // Only reacts to slug changes, not loadDetail identity, to avoid re-loading on every render.
  const urlSlug = searchParams.get("slug");
  useEffect(() => {
    if (urlSlug) loadDetail(urlSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSlug]);

  // Fetch detail. `mode` controls what happens to the breadcrumb trail:
  //   - "start": replace trail with just this page (used for list-panel clicks)
  //   - "push":  append this page to trail (used for wikilink clicks)
  //   - "jump":  truncate trail at this slug (used for breadcrumb clicks)
  const loadDetail = useCallback(async (slug: string, mode: "start" | "push" | "jump" = "start") => {
    setSelectedSlug(slug);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/wiki/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data: WikiPageDetail = await res.json();
        setDetail(data);
        if (mode === "start") {
          setTrail([{ slug: data.slug, title: data.title }]);
        } else if (mode === "push") {
          setTrail((prev) => {
            // If already last in trail (e.g. clicked same link twice), no-op
            if (prev.length > 0 && prev[prev.length - 1].slug === data.slug) return prev;
            return [...prev, { slug: data.slug, title: data.title }];
          });
        } else if (mode === "jump") {
          setTrail((prev) => {
            const idx = prev.findIndex((t) => t.slug === data.slug);
            return idx === -1 ? [{ slug: data.slug, title: data.title }] : prev.slice(0, idx + 1);
          });
        }
      }
    } catch {
      // silently fail
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Handle wikilink navigation (from within page content)
  function handleWikilinkClick(target: string) {
    const normalizedTarget = target.toLowerCase().replace(/\s+/g, "-");
    const match = pages.find((p) => {
      const slugEnd = p.slug.split("/").pop()?.toLowerCase();
      return slugEnd === normalizedTarget;
    });
    loadDetail(match ? match.slug : normalizedTarget, "push");
  }

  // Extract TOC headings (h1-h3 only). Show TOC when >= 3 headings.
  const tocHeadings = detail ? extractHeadings(detail.body) : [];
  const showToc = tocHeadings.length >= 3;

  // Track the currently-visible heading via IntersectionObserver
  useEffect(() => {
    if (!detail || !showToc) {
      setActiveHeading(null);
      return;
    }
    const elements = tocHeadings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Use rootMargin so the "active" heading is the one near the top of the viewport
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the heading nearest the top that is currently intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveHeading(visible[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [detail, showToc, tocHeadings]);

  // Parse forward wikilinks out of the current page body (unique, excluding self)
  const forwardLinks = (() => {
    if (!detail) return [];
    const matches = detail.body.matchAll(/\[\[([^\]]+)\]\]/g);
    const targets = new Set<string>();
    for (const m of matches) {
      const target = m[1].toLowerCase().replace(/\s+/g, "-");
      targets.add(target);
    }
    // Resolve each target to a real page if possible
    return Array.from(targets)
      .map((target) => {
        const match = pages.find((p) => {
          const slugEnd = p.slug.split("/").pop()?.toLowerCase();
          return slugEnd === target;
        });
        return match ? { slug: match.slug, title: match.title, type: match.type } : null;
      })
      .filter((x): x is { slug: string; title: string; type: string } => x !== null)
      .filter((p) => p.slug !== detail.slug);
  })();

  function getTypeConfig(type: string) {
    return TYPE_CONFIG[type] || TYPE_CONFIG.unknown;
  }

  const allTags = Array.from(new Set(pages.flatMap((p) => p.tags))).sort();

  const synthesisPage = pages.find((p) => p.slug === "synthesis/project-overview");

  function formatRelative(iso?: string): string {
    if (!iso) return "";
    const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div className="flex h-full">
      {/* ─── List Panel ─── */}
      <div
        className={`flex flex-col border-r border-[var(--border)] bg-[var(--bg-0)] transition-all duration-200 ${
          selectedSlug ? "w-[340px] shrink-0" : "flex-1 max-w-2xl mx-auto"
        }`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <h1 className="text-[22px] font-[650] tracking-tight text-[var(--text-1)]">
            Wiki
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">
            Browse and search your knowledge base
          </p>
        </div>

        {/* Pinned synthesis card — always-on quick access to the project overview */}
        {synthesisPage && (
          <div className="px-4 pb-3">
            <button
              onClick={() => loadDetail(synthesisPage.slug)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer text-left ${
                selectedSlug === synthesisPage.slug
                  ? "border-[var(--chart-4)] bg-[var(--primary-dim)]"
                  : "border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]"
              }`}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(139,92,246,0.1)" }}
              >
                <Layers className="w-4 h-4" style={{ color: "var(--chart-4)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-[600] text-[var(--text-1)]">
                  Project synthesis
                </div>
                <div className="text-[11px] text-[var(--text-4)] mt-0.5">
                  {synthesisPage.updatedAt
                    ? `Updated ${formatRelative(synthesisPage.updatedAt)}`
                    : "Always-up-to-date overview"}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-4)] shrink-0" />
            </button>
          </div>
        )}

        {/* Search + Filter */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-[var(--bg-1)] border border-[var(--border-input)] rounded-md text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-4)] hover:text-[var(--text-2)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filter dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] border rounded-md transition-all cursor-pointer ${
                typeFilter
                  ? "bg-[var(--primary-dim)] border-[var(--primary)] text-[var(--primary)]"
                  : "bg-[var(--bg-1)] border-[var(--border-input)] text-[var(--text-3)] hover:border-[var(--border-strong)]"
              }`}
            >
              {typeFilter ? getTypeConfig(typeFilter).label : "All types"}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {typeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] z-20 py-1">
                <button
                  onClick={() => { setTypeFilter(""); setTypeDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors cursor-pointer ${
                    !typeFilter ? "bg-[var(--primary-dim)] text-[var(--primary)] font-[550]" : "text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  All types
                </button>
                {ALL_TYPES.map((t) => {
                  const cfg = getTypeConfig(t);
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => { setTypeFilter(t); setTypeDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 transition-colors cursor-pointer ${
                        typeFilter === t ? "bg-[var(--primary-dim)] text-[var(--primary)] font-[550]" : "text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tag pills (when tags exist) */}
        {allTags.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {allTags.slice(0, 12).map((tag) => (
              <button
                key={tag}
                onClick={() => setSearch(tag)}
                className="px-2 py-0.5 text-[11px] font-medium bg-[var(--bg-2)] text-[var(--text-3)] rounded-full hover:bg-[var(--bg-3)] hover:text-[var(--text-2)] transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Related pages (shown when a page is selected) */}
        {detail && (forwardLinks.length > 0 || detail.backlinks.length > 0) && (
          <div className="px-4 pb-3 border-b border-[var(--border)]">
            <div className="text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
              Related
            </div>
            <div className="flex flex-col gap-0.5">
              {forwardLinks.map((p) => {
                const cfg = getTypeConfig(p.type);
                const Icon = cfg.icon;
                return (
                  <button
                    key={`fwd-${p.slug}`}
                    onClick={() => loadDetail(p.slug, "push")}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-[var(--bg-hover)] transition-colors cursor-pointer text-[12px] text-[var(--text-2)]"
                    title="Referenced in this page"
                  >
                    <ChevronRight className="w-3 h-3 text-[var(--text-4)] shrink-0" />
                    <Icon className="w-3 h-3 shrink-0" style={{ color: cfg.color }} />
                    <span className="truncate">{p.title}</span>
                  </button>
                );
              })}
              {detail.backlinks.map((bl) => (
                <button
                  key={`back-${bl.slug}`}
                  onClick={() => loadDetail(bl.slug, "push")}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-[var(--bg-hover)] transition-colors cursor-pointer text-[12px] text-[var(--text-2)]"
                  title="Links to this page"
                >
                  <ArrowLeft className="w-3 h-3 text-[var(--text-4)] shrink-0" />
                  <Link2 className="w-3 h-3 shrink-0 text-[var(--text-3)]" />
                  <span className="truncate">{bl.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results count + bulk toggles (grouped mode only) */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider">
            {loading ? "Loading..." : `${pages.length} page${pages.length !== 1 ? "s" : ""}`}
          </span>
          {!loading && !search && !typeFilter && pages.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={expandAll}
                className="text-[11px] font-[500] text-[var(--text-3)] hover:text-[var(--text-1)] px-1.5 py-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                title="Expand all sections"
              >
                Expand all
              </button>
              <span className="text-[var(--text-4)] text-[11px]">·</span>
              <button
                onClick={collapseAll}
                className="text-[11px] font-[500] text-[var(--text-3)] hover:text-[var(--text-1)] px-1.5 py-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                title="Collapse all sections"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>

        {/* Page list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {(() => {
            if (!loading && pages.length === 0) {
              return (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 mx-auto text-[var(--text-4)] opacity-40 mb-3" />
                  <p className="text-[14px] text-[var(--text-3)]">No pages found</p>
                  <p className="text-[12px] text-[var(--text-4)] mt-1">
                    {search ? "Try a different search term" : "Add sources to your wiki to get started"}
                  </p>
                </div>
              );
            }

            const renderRow = (page: WikiPageMeta) => {
              const cfg = getTypeConfig(page.type);
              const Icon = cfg.icon;
              const isActive = selectedSlug === page.slug;
              return (
                <button
                  key={page.slug}
                  onClick={() => loadDetail(page.slug)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all cursor-pointer ${
                    isActive
                      ? "bg-[var(--primary-dim)] border border-[var(--primary)]/20"
                      : "hover:bg-[var(--bg-hover)] border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: cfg.dimColor }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-[550] text-[var(--text-1)] truncate">
                        {page.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[11px] font-medium px-1.5 py-px rounded"
                          style={{ color: cfg.color, background: cfg.dimColor }}
                        >
                          {cfg.label}
                        </span>
                        {page.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] text-[var(--text-4)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            };

            // When search or type filter is active → flat list (narrowed scope).
            const isGrouped = !search && !typeFilter;
            if (!isGrouped) {
              return pages.map(renderRow);
            }

            // Grouped mode: bucket by type and render each section.
            const buckets = new Map<string, WikiPageMeta[]>();
            for (const page of pages) {
              const list = buckets.get(page.type) ?? [];
              list.push(page);
              buckets.set(page.type, list);
            }

            return ALL_TYPES.filter((t) => buckets.has(t)).map((t) => {
              const items = buckets.get(t)!;
              const cfg = getTypeConfig(t);
              const Icon = cfg.icon;
              const isCollapsed = collapsedSections.has(t);
              return (
                <div key={t} className="mb-2">
                  <button
                    onClick={() => toggleSection(t)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-[var(--text-4)]" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-[var(--text-4)]" />
                    )}
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ background: cfg.dimColor }}
                    >
                      <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                      {SECTION_LABEL[t] ?? cfg.label}
                    </span>
                    <span className="ml-auto text-[11px] font-mono text-[var(--text-4)]">
                      {items.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="mt-0.5">{items.map(renderRow)}</div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ─── Detail Panel ─── */}
      {selectedSlug && (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-0)]">
          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[13px] text-[var(--text-3)]">Loading...</div>
            </div>
          ) : detail ? (
            <div className="max-w-3xl mx-auto px-8 py-6">
              {/* Back + breadcrumb trail */}
              <div className="flex items-center gap-1 flex-wrap mb-4 text-[13px]">
                <button
                  onClick={() => { setSelectedSlug(null); setDetail(null); setTrail([]); }}
                  className="flex items-center gap-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Wiki
                </button>
                {trail.map((entry, idx) => {
                  const isLast = idx === trail.length - 1;
                  return (
                    <div key={`${entry.slug}-${idx}`} className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-[var(--text-4)]" />
                      {isLast ? (
                        <span className="text-[var(--text-1)] font-[550] truncate max-w-[240px]" title={entry.title}>
                          {entry.title}
                        </span>
                      ) : (
                        <button
                          onClick={() => loadDetail(entry.slug, "jump")}
                          className="text-[var(--text-3)] hover:text-[var(--primary)] transition-colors cursor-pointer truncate max-w-[180px]"
                          title={entry.title}
                        >
                          {entry.title}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Title */}
              <h1 className="text-[22px] font-[650] tracking-tight text-[var(--text-1)] mb-3">
                {detail.title}
              </h1>

              {/* Metadata chips */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {/* Type chip */}
                <TypeChip type={detail.type} />

                {/* Tags */}
                {detail.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[var(--bg-2)] text-[var(--text-3)]"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}

                {/* Date if present */}
                {typeof detail.meta.date === "string" ? (
                  <span className="text-[12px] text-[var(--text-4)]">
                    {detail.meta.date}
                  </span>
                ) : null}

                {/* Author if present */}
                {typeof detail.meta.author === "string" ? (
                  <span className="text-[12px] text-[var(--text-4)]">
                    by {detail.meta.author}
                  </span>
                ) : null}
              </div>

              {/* Source file reference */}
              {typeof detail.meta.source_file === "string" ? (
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-4)] mb-4 pb-4 border-b border-[var(--border)]">
                  <FileText className="w-3 h-3" />
                  Source: {detail.meta.source_file}
                </div>
              ) : null}

              {/* Table of contents (for pages with 3+ headings) */}
              {showToc && (
                <div className="mb-5 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setTocExpanded((v) => !v)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[var(--text-4)] transition-transform ${tocExpanded ? "" : "-rotate-90"}`}
                    />
                    <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                      On this page
                    </span>
                    <span className="ml-auto text-[11px] text-[var(--text-4)] font-mono">
                      {tocHeadings.length}
                    </span>
                  </button>
                  {tocExpanded && (
                    <div className="px-4 pb-3 pt-1">
                      <ul className="space-y-0.5 text-[13px]">
                        {tocHeadings.map((h) => {
                          const isActive = activeHeading === h.id;
                          return (
                            <li key={h.id}>
                              <button
                                onClick={() => {
                                  const el = document.getElementById(h.id);
                                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                                className={`w-full text-left py-1 transition-colors cursor-pointer border-l-2 pl-3 ${
                                  isActive
                                    ? "border-[var(--primary)] text-[var(--primary)] font-[550]"
                                    : "border-transparent text-[var(--text-3)] hover:text-[var(--text-1)] hover:border-[var(--border-strong)]"
                                }`}
                                style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
                              >
                                {h.text}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Rendered body */}
              <div className="wiki-content">
                {renderMarkdown(
                  detail.body,
                  handleWikilinkClick,
                  // Only synthesis pages get per-item Research buttons —
                  // other page types might legitimately have a "Gaps" heading
                  // that isn't meant to be actionable.
                  detail.type === "synthesis"
                    ? (topic: string) =>
                        router.push(
                          `/sources?tab=research&topic=${encodeURIComponent(topic)}`
                        )
                    : undefined
                )}
              </div>

              {/* Backlinks */}
              {detail.backlinks.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5 text-[13px] font-[600] text-[var(--text-2)] mb-3">
                    <Link2 className="w-4 h-4" />
                    Linked from {detail.backlinks.length} page{detail.backlinks.length !== 1 ? "s" : ""}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.backlinks.map((bl) => (
                      <button
                        key={bl.slug}
                        onClick={() => loadDetail(bl.slug, "push")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--primary)] hover:border-[var(--primary)] transition-colors cursor-pointer"
                      >
                        <Link2 className="w-3 h-3" />
                        {bl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Empty state when no page selected and we have a wide view */}
      {!selectedSlug && pages.length > 0 && (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-[var(--bg-1)]">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto text-[var(--text-4)] opacity-30 mb-3" />
            <p className="text-[14px] text-[var(--text-3)]">Select a page to view</p>
          </div>
        </div>
      )}
    </div>
  );
}
