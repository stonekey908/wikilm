"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PreviewData {
  title: string;
  type: string;
  body: string;
  tags: string[];
  projectSlug: string;
  backlinksCount: number;
}

interface PreviewState {
  visible: boolean;
  x: number;
  y: number;
  data: PreviewData | null;
  loading: boolean;
}

const CACHE = new Map<string, PreviewData>();

/**
 * Extract the first ~20 words of body (stripping markdown heading, wikilinks,
 * bold/italic markers) as a preview excerpt.
 */
function extractExcerpt(body: string): string {
  const stripped = body
    .replace(/^---[\s\S]*?---\n/, "")
    .replace(/^#\s+.+$/m, "")
    .replace(/\[\[([^\]]+)\]\]/g, (_, raw) => {
      const pipe = raw.indexOf("|");
      return pipe !== -1 ? raw.slice(pipe + 1) : raw.split("/").pop();
    })
    .replace(/[*`_#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = stripped.split(" ").slice(0, 28).join(" ");
  return words + (stripped.split(" ").length > 28 ? "…" : "");
}

function splitTitleOnLastWord(title: string): { lead: string; tail: string } {
  const parts = title.trim().split(/\s+/);
  if (parts.length <= 1) return { lead: "", tail: title };
  return { lead: parts.slice(0, -1).join(" ") + " ", tail: parts[parts.length - 1] };
}

export function useWikiPreview(projectId: number | null) {
  const [state, setState] = useState<PreviewState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
    loading: false,
  });
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const currentTarget = useRef<string | null>(null);

  const clearShow = () => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  };
  const clearHide = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  function placeNear(px: number, py: number) {
    // Anchor the card ~16px below-right of the cursor, clamp to viewport.
    const W = 340;
    const approxH = 220;
    const margin = 16;
    let x = px + 14;
    let y = py + 18;
    if (x + W > window.innerWidth - margin) x = window.innerWidth - W - margin;
    if (x < margin) x = margin;
    if (y + approxH > window.innerHeight - margin) y = py - approxH - 14;
    if (y < margin) y = margin;
    return { x, y };
  }

  const onHover = useCallback(
    (pt: { x: number; y: number }, target: string) => {
      clearHide();
      // If the card is already visible for this target, just update the
      // position so it tracks the cursor naturally across a multi-line link.
      if (currentTarget.current === target) {
        const { x, y } = placeNear(pt.x, pt.y);
        setState((s) => ({ ...s, x, y }));
        return;
      }
      currentTarget.current = target;

      clearShow();
      const { x: initX, y: initY } = placeNear(pt.x, pt.y);
      showTimer.current = window.setTimeout(async () => {
        if (currentTarget.current !== target) return;

        // Normalize target → slug (strip optional `project/` prefix for same-project lookups)
        const slug = target.includes("/") ? target.split("/").slice(-1)[0] : target;

        let data = CACHE.get(target);
        if (!data) {
          setState((s) => ({ ...s, visible: true, x: initX, y: initY, loading: true, data: null }));
          try {
            const url = projectId
              ? `/api/wiki/${encodeURIComponent(slug)}?projectId=${projectId}`
              : `/api/wiki/${encodeURIComponent(slug)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("not found");
            const json = await res.json();
            data = {
              title: json.title,
              type: json.type,
              body: json.body,
              tags: json.tags ?? [],
              projectSlug: "",
              backlinksCount: json.backlinks?.length ?? 0,
            };
            CACHE.set(target, data);
          } catch {
            setState((s) => ({ ...s, visible: false, loading: false }));
            return;
          }
        }
        if (currentTarget.current !== target) return;
        setState({ visible: true, x: initX, y: initY, data, loading: false });
      }, 140);
    },
    [projectId]
  );

  const onLeave = useCallback(() => {
    clearShow();
    currentTarget.current = null;
    clearHide();
    // Short delay so the card can persist while the pointer crosses the gap
    // between the link and the card — the card itself sets pointer-events:
    // auto when .show so hovering it re-triggers onHover via the card (no),
    // we keep it simple: always hide after the grace window.
    hideTimer.current = window.setTimeout(() => {
      setState((s) => ({ ...s, visible: false }));
    }, 120);
  }, []);

  // Global fallback — if the pointer leaves the viewport or any unrelated
  // scroll / click fires, forcibly hide. The old implementation relied on
  // the link's onMouseLeave firing, which can miss when the link is inside
  // a scrolling container or when the element unmounts mid-hover.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hideNow = () => {
      clearShow();
      clearHide();
      currentTarget.current = null;
      setState((s) => ({ ...s, visible: false }));
    };
    window.addEventListener("scroll", hideNow, true);
    window.addEventListener("pointerdown", hideNow, true);
    document.addEventListener("mouseleave", hideNow);
    return () => {
      window.removeEventListener("scroll", hideNow, true);
      window.removeEventListener("pointerdown", hideNow, true);
      document.removeEventListener("mouseleave", hideNow);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearShow();
      clearHide();
    };
  }, []);

  const PreviewCard = () => {
    if (!state.data) return null;
    const { lead, tail } = splitTitleOnLastWord(state.data.title);
    const excerpt = extractExcerpt(state.data.body);
    const type = state.data.type.toUpperCase();
    return (
      <div
        className={`preview${state.visible ? " show" : ""}`}
        style={{ left: `${state.x}px`, top: `${state.y}px` }}
      >
        <div className="crumb">{type}</div>
        <h5>
          {lead}
          <em>{tail}</em>
        </h5>
        <p>{excerpt}</p>
        <div className="mbox">
          <span className="seal ghost">{type}</span>
          {state.data.backlinksCount > 0 && (
            <span className="seal ghost">{state.data.backlinksCount} BACKLINKS</span>
          )}
          {state.data.tags.slice(0, 1).map((t) => (
            <span key={t} className="seal ghost">
              {t.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return { onHover, onLeave, PreviewCard };
}
