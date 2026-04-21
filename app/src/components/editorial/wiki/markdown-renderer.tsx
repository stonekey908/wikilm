"use client";

import React from "react";

export interface Heading {
  id: string;
  level: number;
  text: string;
  section?: string;
}

export interface RenderOpts {
  onWikilinkClick: (target: string) => void;
  onWikilinkHover: (pt: { x: number; y: number }, target: string) => void;
  onWikilinkLeave: () => void;
}

const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const CODE_FENCE_RE = /^```(\w*)$/;
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const CITATION_RE = /\[(\d+)\]/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const ITALIC_RE = /(?<!\*)\*([^*]+)\*(?!\*)/g;
const INLINE_CODE_RE = /`([^`]+)`/g;

function slugify(text: string, seen: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  const count = (seen.get(base) ?? 0) + 1;
  seen.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

/** Pull h1/h2/h3 out of body so the TOC can be built independently. */
export function extractHeadings(body: string): Heading[] {
  const out: Heading[] = [];
  const seen = new Map<string, number>();
  let h2Count = 0;
  const lines = body.split("\n");
  let inFence = false;
  for (const line of lines) {
    if (CODE_FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(HEADING_RE);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2]
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/[*`_]/g, "")
      .trim();
    const id = slugify(text, seen);
    let section: string | undefined;
    if (level === 2) {
      h2Count++;
      section = `§ ${String(h2Count).padStart(2, "0")}`;
    }
    out.push({ id, level, text, section });
  }
  return out;
}

/** Parse a `[[wikilink]]` target — supports `slug`, `project/slug`, and `slug|display`. */
function parseWikilink(raw: string): { target: string; display: string } {
  const pipe = raw.indexOf("|");
  if (pipe !== -1) {
    return { target: raw.slice(0, pipe).trim(), display: raw.slice(pipe + 1).trim() };
  }
  const last = raw.split("/").pop() ?? raw;
  return { target: raw.trim(), display: last.replace(/-/g, " ") };
}

/**
 * Render an inline text span to React nodes. Handles wikilinks, citations,
 * markdown links, bold/italic, inline code. Order matters — wikilinks and
 * citations first (they're most distinctive) so the simpler italic regex
 * doesn't eat them.
 */
function renderInline(text: string, opts: RenderOpts, keyPrefix: string): React.ReactNode[] {
  // Strategy: walk the text, emitting segments as we find tokens.
  // For simplicity we do multi-pass — turn wikilinks into placeholders,
  // then citations, then inline formatting, then expand placeholders.
  type Token = {
    kind: "text" | "wikilink" | "cite" | "link" | "bold" | "italic" | "code";
    raw: string;
    display?: string;
    target?: string;
  };
  const tokens: Token[] = [];
  let remaining = text;
  // Tokenize wikilinks first
  let idx = 0;
  const safeRemaining = remaining;
  const matches: {
    start: number;
    end: number;
    kind: Token["kind"];
    raw: string;
    display?: string;
    target?: string;
  }[] = [];

  function collect(re: RegExp, kind: Token["kind"], fn: (m: RegExpExecArray) => { display?: string; target?: string } = () => ({})) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(safeRemaining)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        kind,
        raw: m[0],
        ...fn(m),
      });
    }
  }

  collect(WIKILINK_RE, "wikilink", (m) => {
    const parsed = parseWikilink(m[1]);
    return { target: parsed.target, display: parsed.display };
  });
  collect(MARKDOWN_LINK_RE, "link", (m) => ({ display: m[1], target: m[2] }));
  collect(INLINE_CODE_RE, "code", (m) => ({ display: m[1] }));
  collect(BOLD_RE, "bold", (m) => ({ display: m[1] }));
  collect(ITALIC_RE, "italic", (m) => ({ display: m[1] }));
  collect(CITATION_RE, "cite", (m) => ({ display: m[1] }));

  // Sort matches by start, drop overlaps (first-match wins)
  matches.sort((a, b) => a.start - b.start);
  const kept: typeof matches = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    kept.push(m);
    cursor = m.end;
  }

  // Build token stream
  let pos = 0;
  for (const m of kept) {
    if (m.start > pos) {
      tokens.push({ kind: "text", raw: safeRemaining.slice(pos, m.start) });
    }
    tokens.push({ kind: m.kind, raw: m.raw, display: m.display, target: m.target });
    pos = m.end;
  }
  if (pos < safeRemaining.length) {
    tokens.push({ kind: "text", raw: safeRemaining.slice(pos) });
  }

  // Emit React nodes
  const nodes: React.ReactNode[] = [];
  tokens.forEach((t, i) => {
    const k = `${keyPrefix}-${i}`;
    switch (t.kind) {
      case "wikilink":
        nodes.push(
          <a
            key={k}
            className="wikilink"
            data-target={t.target}
            onClick={(e) => {
              e.preventDefault();
              opts.onWikilinkClick(t.target!);
            }}
            onMouseEnter={(e) => opts.onWikilinkHover({ x: e.clientX, y: e.clientY }, t.target!)}
            onMouseMove={(e) => opts.onWikilinkHover({ x: e.clientX, y: e.clientY }, t.target!)}
            onMouseLeave={() => opts.onWikilinkLeave()}
          >
            {t.display}
          </a>
        );
        break;
      case "cite":
        nodes.push(
          <span key={k} className="cite">
            [{t.display}]
          </span>
        );
        break;
      case "link": {
        const isExt = /^https?:/.test(t.target ?? "");
        nodes.push(
          <a
            key={k}
            href={t.target}
            target={isExt ? "_blank" : undefined}
            rel={isExt ? "noreferrer noopener" : undefined}
          >
            {t.display}
          </a>
        );
        break;
      }
      case "code":
        nodes.push(<code key={k}>{t.display}</code>);
        break;
      case "bold":
        nodes.push(
          <strong key={k}>{renderInline(t.display ?? "", opts, k)}</strong>
        );
        break;
      case "italic":
        nodes.push(<em key={k}>{renderInline(t.display ?? "", opts, k)}</em>);
        break;
      case "text":
        nodes.push(t.raw);
        break;
    }
  });

  return nodes;
}

type Block =
  | { kind: "p"; text: string; isLede?: boolean }
  | { kind: "h"; level: number; text: string; id: string; section?: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "code"; lang: string; body: string }
  | { kind: "quote"; text: string }
  | { kind: "hr" };

function parseBlocks(body: string): Block[] {
  const lines = body.split("\n");
  const blocks: Block[] = [];
  const seen = new Map<string, number>();
  let h2Count = 0;
  let i = 0;

  function flushParagraph(buf: string[], firstPara: boolean) {
    if (buf.length === 0) return;
    const text = buf.join(" ").trim();
    if (text) blocks.push({ kind: "p", text, isLede: firstPara });
  }

  let seenFirstPara = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip the first H1 (it's the article title) and any empty lines
    if (trimmed === "") {
      i++;
      continue;
    }

    // Code fence
    const fenceMatch = trimmed.match(CODE_FENCE_RE);
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !CODE_FENCE_RE.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: "code", lang, body: codeLines.join("\n") });
      continue;
    }

    // HR
    if (/^-{3,}$|^_{3,}$|^\*{3,}$/.test(trimmed)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Heading
    const h = trimmed.match(HEADING_RE);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      // Skip h1 — that's the article title (rendered separately)
      if (level === 1) {
        i++;
        continue;
      }
      const plain = text.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/[*`_]/g, "").trim();
      const id = slugify(plain, seen);
      let section: string | undefined;
      if (level === 2) {
        h2Count++;
        section = `§ ${String(h2Count).padStart(2, "0")}`;
      }
      blocks.push({ kind: "h", level, text, id, section });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", text: quoteLines.join(" ") });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph — accumulate until blank line or another block starts
    const buf: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (t === "") break;
      if (HEADING_RE.test(t)) break;
      if (CODE_FENCE_RE.test(t)) break;
      if (/^[-*]\s+/.test(t)) break;
      if (/^\d+\.\s+/.test(t)) break;
      if (t.startsWith(">")) break;
      if (/^-{3,}$|^_{3,}$|^\*{3,}$/.test(t)) break;
      buf.push(t);
      i++;
    }
    flushParagraph(buf, !seenFirstPara);
    if (buf.length > 0) seenFirstPara = true;
  }

  return blocks;
}

export function MarkdownBody({ body, opts }: { body: string; opts: RenderOpts }) {
  const blocks = parseBlocks(body);
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        switch (b.kind) {
          case "p":
            return (
              <p key={key} className={b.isLede ? "lede" : undefined}>
                {renderInline(b.text, opts, key)}
              </p>
            );
          case "h": {
            if (b.level === 2) {
              return (
                <h2 key={key} id={b.id}>
                  <span className="n">{b.section}</span>
                  {renderInline(b.text, opts, key)}
                </h2>
              );
            }
            if (b.level === 3) {
              return <h3 key={key} id={b.id}>{renderInline(b.text, opts, key)}</h3>;
            }
            return null;
          }
          case "ul":
            return (
              <ul key={key}>
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`}>{renderInline(it, opts, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key}>
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`}>{renderInline(it, opts, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre key={key}>
                <code>{b.body}</code>
              </pre>
            );
          case "quote":
            return <blockquote key={key}>{renderInline(b.text, opts, key)}</blockquote>;
          case "hr":
            return <hr key={key} />;
        }
      })}
    </div>
  );
}
