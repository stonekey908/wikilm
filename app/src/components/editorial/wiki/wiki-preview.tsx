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

  const onHover = useCallback(
    (el: HTMLAnchorElement, target: string) => {
      clearHide();
      currentTarget.current = target;
      const rect = el.getBoundingClientRect();
      let x = rect.left;
      let y = rect.bottom + 10;
      if (x + 340 > window.innerWidth - 16) x = window.innerWidth - 340 - 16;
      if (y + 220 > window.innerHeight - 16) y = rect.top - 232;

      clearShow();
      showTimer.current = window.setTimeout(async () => {
        if (currentTarget.current !== target) return;

        // Normalize target → slug (strip optional `project/` prefix for same-project lookups)
        const slug = target.includes("/") ? target.split("/").slice(-1)[0] : target;

        let data = CACHE.get(target);
        if (!data) {
          setState((s) => ({ ...s, visible: true, x, y, loading: true, data: null }));
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
        setState({ visible: true, x, y, data, loading: false });
      }, 150);
    },
    [projectId]
  );

  const onLeave = useCallback(() => {
    clearShow();
    currentTarget.current = null;
    clearHide();
    hideTimer.current = window.setTimeout(() => {
      setState((s) => ({ ...s, visible: false }));
    }, 180);
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
