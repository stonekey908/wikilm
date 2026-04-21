"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { useTweaks } from "./tweaks-provider";
import { FOLIO, VIEW_ORDER, type EditorialView } from "./folio-map";

interface WikiPageIx {
  title: string;
  slug: string;
  type: string;
  updatedAt: string;
}

type PalItem =
  | { kind: "page"; title: string; sub: string; icn: string; slug: string; key: string }
  | { kind: "nav"; title: string; sub: string; icn: string; view: EditorialView; key: string }
  | { kind: "action"; title: string; sub: string; icn: string; onRun: () => void; key: string }
  | { kind: "tweak"; title: string; sub: string; icn: string; onRun: () => void; key: string }
  | { kind: "research"; title: string; sub: string; icn: string; topic: string; key: string };

function scorePage(p: WikiPageIx, q: string): number {
  if (!q) return 0;
  const hay = `${p.title} ${p.slug} ${p.type}`.toLowerCase();
  if (hay.startsWith(q)) return 3;
  if (hay.includes(q)) return 2;
  return 0;
}

export function Palette() {
  const router = useRouter();
  const { activeProject, projects } = useProject();
  const { openPanel, setTweak, state: tweakState } = useTweaks();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [pages, setPages] = useState<WikiPageIx[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQ("");
    setActive(0);
  }, []);
  const closePalette = useCallback(() => setOpen(false), []);

  // Global ⌘K + ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Topbar omnibar click
  useEffect(() => {
    const onEvt = () => openPalette();
    window.addEventListener("editorial:open-palette", onEvt);
    return () => window.removeEventListener("editorial:open-palette", onEvt);
  }, [openPalette]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  // Lazy-load wiki page index (refresh each time palette opens)
  useEffect(() => {
    if (!open || !activeProject) return;
    let cancelled = false;
    fetch(`/api/wiki?projectId=${activeProject.id}`)
      .then((r) => r.json())
      .then((d: { pages: WikiPageIx[] }) => {
        if (!cancelled) {
          setPages((d.pages ?? []).filter((p) => !["index", "log"].includes(p.slug)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, activeProject]);

  const items: PalItem[] = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out: PalItem[] = [];

    // Pages
    const pageMatches = query
      ? pages
          .map((p) => ({ p, s: scorePage(p, query) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 12)
      : pages
          .slice(0, 8)
          .map((p) => ({ p, s: 0 }));
    for (const { p } of pageMatches) {
      out.push({
        kind: "page",
        title: p.title,
        sub: `${p.type} · ${p.slug}`,
        icn: "§",
        slug: p.slug,
        key: `pg-${p.slug}`,
      });
    }

    // Research
    if (query.length > 2) {
      out.push({
        kind: "research",
        title: `Research · ${query}`,
        sub: "Commission Claude to search the web",
        icn: "✦",
        topic: query,
        key: "research",
      });
    }

    // Navigate
    for (const v of VIEW_ORDER) {
      const f = FOLIO[v];
      if (query && !f.label.toLowerCase().includes(query) && !f.name.toLowerCase().includes(query)) continue;
      out.push({
        kind: "nav",
        title: `Go to ${f.label}`,
        sub: `⌘${VIEW_ORDER.indexOf(v) + 1} · ${f.name.toLowerCase()}`,
        icn: "→",
        view: v,
        key: `nav-${v}`,
      });
    }

    // Actions
    const actions: PalItem[] = [
      {
        kind: "action",
        title: "Dictate a brief",
        sub: "Generate an editorial artifact",
        icn: "✎",
        onRun: () => router.push("/compose"),
        key: "act-dictate",
      },
      {
        kind: "action",
        title: "Open Intake",
        sub: "Upload, paste URLs, commission research",
        icn: "✚",
        onRun: () => router.push("/sources"),
        key: "act-intake",
      },
      {
        kind: "tweak",
        title: "Open Set type",
        sub: "Theme, accent, face, size, grain",
        icn: "✦",
        onRun: () => openPanel(),
        key: "act-tweaks",
      },
      {
        kind: "tweak",
        title: tweakState.grain ? "Turn grain off" : "Turn grain on",
        sub: "Paper texture overlay",
        icn: "·",
        onRun: () => setTweak("grain", !tweakState.grain),
        key: "act-grain",
      },
    ];
    for (const a of actions) {
      const hay = `${a.title} ${a.sub}`.toLowerCase();
      if (!query || hay.includes(query)) out.push(a);
    }

    return out;
  }, [q, pages, router, openPanel, setTweak, tweakState.grain]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  const run = useCallback(
    (i: number) => {
      const it = items[i];
      if (!it) return;
      setOpen(false);
      if (it.kind === "page") {
        router.push(`/wiki?slug=${encodeURIComponent(it.slug)}`);
      } else if (it.kind === "nav") {
        router.push(FOLIO[it.view].path);
      } else if (it.kind === "action" || it.kind === "tweak") {
        it.onRun();
      } else if (it.kind === "research") {
        router.push(`/sources?tab=research&topic=${encodeURIComponent(it.topic)}`);
        addToast({ type: "success", title: `Commissioning · ${it.topic}` });
      }
    },
    [items, router, addToast]
  );

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(active);
    }
  }

  // Scroll active row into view
  useEffect(() => {
    if (!bodyRef.current) return;
    const el = bodyRef.current.querySelector(`[data-idx="${active}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [active, items]);

  // Group render
  const grouped = useMemo(() => {
    const groups: { label: string; items: { item: PalItem; idx: number }[] }[] = [];
    const push = (label: string, kinds: PalItem["kind"][]) => {
      const found = items
        .map((item, idx) => ({ item, idx }))
        .filter((x) => kinds.includes(x.item.kind));
      if (found.length > 0) groups.push({ label, items: found });
    };
    push("Pages", ["page"]);
    push("Research", ["research"]);
    push("Navigate", ["nav"]);
    push("Actions", ["action", "tweak"]);
    return groups;
  }, [items]);

  return (
    <div className={`palette-bg${open ? " open" : ""}`} onClick={closePalette}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-in">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="7" cy="7" r="5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask, search, command…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
        </div>
        <div className="palette-body" ref={bodyRef}>
          {items.length === 0 ? (
            <div className="palette-empty">
              {activeProject
                ? `No matches in ${activeProject.name}. Type to search pages, commission research, or navigate.`
                : "No active project."}
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.label}>
                <div className="pg">{g.label}</div>
                {g.items.map(({ item, idx }) => (
                  <div
                    key={item.key}
                    data-idx={idx}
                    className={`prow${active === idx ? " act" : ""}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => run(idx)}
                  >
                    <span className="icn">{item.icn}</span>
                    <span className="tt">
                      {item.title}
                      <small>{item.sub}</small>
                    </span>
                    <span className="k">↵</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
