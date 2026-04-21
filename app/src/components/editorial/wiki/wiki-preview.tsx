"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PreviewData {
  title: string;
  type: string;
  body: string;
  tags: string[];
  projectSlug: string;
  backlinksCount: number;
}

const CACHE = new Map<string, PreviewData>();

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

const CARD_W = 340;
const CARD_H_APPROX = 220;
const MARGIN = 16;

function place(cursorX: number, cursorY: number): { x: number; y: number } {
  let x = cursorX + 14;
  let y = cursorY + 18;
  if (x + CARD_W > window.innerWidth - MARGIN) x = window.innerWidth - CARD_W - MARGIN;
  if (x < MARGIN) x = MARGIN;
  if (y + CARD_H_APPROX > window.innerHeight - MARGIN) y = cursorY - CARD_H_APPROX - 14;
  if (y < MARGIN) y = MARGIN;
  return { x, y };
}

export function useWikiPreview(projectId: number | null) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<PreviewData | null>(null);
  const [mounted, setMounted] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const currentTarget = useRef<string | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const rafPending = useRef(false);
  const latestCursor = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const applyPosition = useCallback(() => {
    rafPending.current = false;
    if (!cardRef.current) return;
    const { x, y } = place(latestCursor.current.x, latestCursor.current.y);
    cardRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const scheduleMove = useCallback(
    (x: number, y: number) => {
      latestCursor.current = { x, y };
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(applyPosition);
    },
    [applyPosition]
  );

  const clearTimers = () => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const onHover = useCallback(
    (pt: { x: number; y: number }, target: string) => {
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }

      // Track every move — position is DOM-mutated via rAF, no React render.
      scheduleMove(pt.x, pt.y);

      // Same link being tracked — nothing else to do.
      if (currentTarget.current === target) return;
      currentTarget.current = target;

      if (showTimer.current !== null) window.clearTimeout(showTimer.current);
      showTimer.current = window.setTimeout(async () => {
        if (currentTarget.current !== target) return;

        const slug = target.includes("/") ? target.split("/").slice(-1)[0] : target;
        let d = CACHE.get(target);
        if (!d) {
          try {
            const url = projectId
              ? `/api/wiki/${encodeURIComponent(slug)}?projectId=${projectId}`
              : `/api/wiki/${encodeURIComponent(slug)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("not found");
            const json = await res.json();
            d = {
              title: json.title,
              type: json.type,
              body: json.body,
              tags: json.tags ?? [],
              projectSlug: "",
              backlinksCount: json.backlinks?.length ?? 0,
            };
            CACHE.set(target, d);
          } catch {
            return;
          }
        }
        if (currentTarget.current !== target) return;
        setData(d);
        setVisible(true);
        requestAnimationFrame(applyPosition);
      }, 120);
    },
    [projectId, scheduleMove, applyPosition]
  );

  const hardHide = useCallback(() => {
    clearTimers();
    currentTarget.current = null;
    setVisible(false);
  }, []);

  const onLeave = useCallback(() => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    currentTarget.current = null;
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), 80);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("scroll", hardHide, true);
    window.addEventListener("pointerdown", hardHide, true);
    document.addEventListener("mouseleave", hardHide);
    return () => {
      window.removeEventListener("scroll", hardHide, true);
      window.removeEventListener("pointerdown", hardHide, true);
      document.removeEventListener("mouseleave", hardHide);
    };
  }, [hardHide]);

  const PreviewCard = () => {
    if (!mounted || !data) return null;
    const { lead, tail } = splitTitleOnLastWord(data.title);
    const excerpt = extractExcerpt(data.body);
    const type = data.type.toUpperCase();
    const node = (
      <div
        ref={cardRef}
        className={`preview${visible ? " show" : ""}`}
        style={{
          // position is mutated via transform on rAF; the initial transform
          // keeps it off-screen until the first move fires
          top: 0,
          left: 0,
          transform: "translate3d(-9999px, -9999px, 0)",
          willChange: "transform",
        }}
      >
        <div className="crumb">{type}</div>
        <h5>
          {lead}
          <em>{tail}</em>
        </h5>
        <p>{excerpt}</p>
        <div className="mbox">
          <span className="seal ghost">{type}</span>
          {data.backlinksCount > 0 && (
            <span className="seal ghost">{data.backlinksCount} BACKLINKS</span>
          )}
          {data.tags.slice(0, 1).map((t) => (
            <span key={t} className="seal ghost">
              {t.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    );
    // Portal to document.body so .content's zoom transform doesn't move the card.
    return createPortal(node, document.body);
  };

  return { onHover, onLeave, PreviewCard };
}
