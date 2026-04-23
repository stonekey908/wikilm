"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { helpTopics, HELP_SECTIONS, topicsBySection, type HelpSection } from "@/content/help";

function renderMarkdownInline(md: string): string {
  // Very small, hand-rolled renderer — enough for the help bodies we author.
  // Handles: headings, code fences, inline code, bold, italic, unordered lists,
  // ordered lists, tables, links, and paragraphs. Escapes HTML first.
  const lines = md.replace(/</g, "&lt;").replace(/>/g, "&gt;").split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let inTable = false;
  let tableBuf: string[] = [];

  const flushList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };
  const flushTable = () => {
    if (!inTable) return;
    if (tableBuf.length === 0) return;
    const rows = tableBuf.map((r) =>
      r
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim())
    );
    const [header, , ...body] = rows;
    const thead = `<thead><tr>${header.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    out.push(`<table class="help-table">${thead}${tbody}</table>`);
    tableBuf = [];
    inTable = false;
  };

  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>'
      );

  for (const raw of lines) {
    if (raw.startsWith("```")) {
      flushList();
      flushTable();
      if (inCode) {
        out.push(`<pre class="help-pre"><code>${codeBuf.join("\n")}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    // Tables (very light GFM support)
    if (raw.trim().startsWith("|") && raw.trim().endsWith("|")) {
      flushList();
      if (!inTable) inTable = true;
      tableBuf.push(raw);
      continue;
    } else if (inTable) {
      flushTable();
    }

    const h = raw.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      const level = h[1].length + 2; // h3..h6 in page scope
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const ul = raw.match(/^[-*]\s+(.*)$/);
    if (ul) {
      if (inList !== "ul") {
        flushList();
        out.push("<ul>");
        inList = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    const ol = raw.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (inList !== "ol") {
        flushList();
        out.push("<ol>");
        inList = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    if (raw.trim() === "") {
      flushList();
      continue;
    }
    flushList();
    out.push(`<p>${inline(raw)}</p>`);
  }

  flushList();
  flushTable();
  if (inCode && codeBuf.length) {
    out.push(`<pre class="help-pre"><code>${codeBuf.join("\n")}</code></pre>`);
  }
  return out.join("\n");
}

export default function HelpPage() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Sync the hash with the active topic so deep links (/help#mcp-setup) scroll
  // the matching anchor into view.
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) setActiveSlug(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const grouped = useMemo(
    () =>
      HELP_SECTIONS.map((s) => ({ section: s, topics: topicsBySection(s) })).filter(
        (g) => g.topics.length > 0
      ),
    []
  );

  return (
    <div className="help-page">
      <header className="help-head">
        <div className="help-pre-title">HELP · KNOWLEDGE BANK</div>
        <h1>Using WikiLM</h1>
        <p className="help-sub">
          Everything you need to know — from dropping your first source to wiring the MCP server into
          another Claude Code session.
        </p>
      </header>

      <div className="help-body">
        <aside className="help-nav">
          {grouped.map(({ section, topics }) => (
            <div key={section} className="help-nav-group">
              <div className="help-nav-section">{section}</div>
              <ul>
                {topics.map((t) => (
                  <li key={t.slug}>
                    <a
                      href={`#${t.slug}`}
                      className={activeSlug === t.slug ? "on" : ""}
                      onClick={() => setActiveSlug(t.slug)}
                    >
                      {t.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <article className="help-content">
          {grouped.map(({ section, topics }) => (
            <section key={section} className="help-section">
              <h2 className="help-section-title">{section}</h2>
              {topics.map((t) => (
                <div key={t.slug} id={t.slug} className="help-topic">
                  <h3 className="help-topic-title">
                    <a href={`#${t.slug}`}>{t.title}</a>
                  </h3>
                  <p className="help-topic-summary">{t.summary}</p>
                  <div
                    className="help-topic-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownInline(t.body) }}
                  />
                </div>
              ))}
            </section>
          ))}

          <div className="help-foot">
            <p>
              Still stuck? Open the <Link href="/chat">Salon</Link> and just ask — the chat has the whole
              help bank as context and will answer how-to questions inline, with pointers back to specific
              topics here.
            </p>
          </div>
        </article>
      </div>

      <HelpStyles totalTopics={helpTopics.length} />
    </div>
  );
}

function HelpStyles({ totalTopics: _totalTopics }: { totalTopics: number }) {
  return (
    <style jsx global>{`
      .help-page {
        max-width: 1160px;
        margin: 0 auto;
        padding: 40px 32px 80px;
      }
      .help-head {
        border-bottom: 1.5px solid var(--rule);
        padding-bottom: 24px;
        margin-bottom: 32px;
      }
      .help-pre-title {
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 10px;
      }
      .help-head h1 {
        font-family: var(--font-serif);
        font-size: 44px;
        font-weight: 700;
        line-height: 1;
        margin: 0 0 16px;
        color: var(--ink);
      }
      .help-sub {
        font-family: var(--font-inst);
        font-style: italic;
        font-size: 17px;
        color: var(--ink-2);
        max-width: 60ch;
        margin: 0;
      }
      .help-body {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 48px;
        align-items: start;
      }
      .help-nav {
        position: sticky;
        top: 24px;
        max-height: calc(100vh - 48px);
        overflow-y: auto;
      }
      .help-nav-group {
        margin-bottom: 18px;
      }
      .help-nav-section {
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-3);
        margin-bottom: 6px;
      }
      .help-nav ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .help-nav li {
        margin: 0;
      }
      .help-nav a {
        display: block;
        font-family: var(--font-serif);
        font-size: 13px;
        color: var(--ink-2);
        text-decoration: none;
        padding: 3px 0;
        border-left: 2px solid transparent;
        padding-left: 10px;
        margin-left: -10px;
        transition: color 120ms, border-color 120ms;
      }
      .help-nav a:hover,
      .help-nav a.on {
        color: var(--ink);
        border-left-color: var(--accent);
      }
      .help-content {
        max-width: 72ch;
      }
      .help-section {
        margin-bottom: 56px;
      }
      .help-section-title {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent);
        margin: 0 0 20px;
      }
      .help-topic {
        margin-bottom: 40px;
        padding-bottom: 40px;
        border-bottom: 1px dashed var(--rule-faint);
      }
      .help-topic:last-child {
        border-bottom: none;
      }
      .help-topic-title {
        font-family: var(--font-serif);
        font-size: 26px;
        font-weight: 700;
        line-height: 1.15;
        color: var(--ink);
        margin: 0 0 8px;
        scroll-margin-top: 24px;
      }
      .help-topic-title a {
        color: inherit;
        text-decoration: none;
      }
      .help-topic-title a:hover {
        color: var(--accent);
      }
      .help-topic-summary {
        font-family: var(--font-inst);
        font-style: italic;
        font-size: 15px;
        color: var(--ink-2);
        margin: 0 0 18px;
        max-width: 60ch;
      }
      .help-topic-body {
        font-family: var(--font-serif);
        font-size: 15px;
        line-height: 1.65;
        color: var(--ink-2);
      }
      .help-topic-body p {
        margin: 0 0 14px;
      }
      .help-topic-body strong {
        color: var(--ink);
        font-weight: 700;
      }
      .help-topic-body em {
        font-style: italic;
      }
      .help-topic-body code {
        font-family: var(--font-mono);
        font-size: 12.5px;
        background: var(--paper-2);
        border: 1px solid var(--rule-faint);
        border-radius: 2px;
        padding: 1px 5px;
      }
      .help-topic-body a {
        color: var(--accent);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .help-topic-body ul,
      .help-topic-body ol {
        margin: 0 0 14px;
        padding-left: 22px;
      }
      .help-topic-body li {
        margin-bottom: 6px;
      }
      .help-pre {
        font-family: var(--font-mono);
        font-size: 12.5px;
        background: var(--paper-2);
        border: 1px solid var(--rule-faint);
        padding: 12px 14px;
        overflow-x: auto;
        margin: 0 0 14px;
      }
      .help-pre code {
        background: none;
        border: none;
        padding: 0;
      }
      .help-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 14px;
        font-family: var(--font-serif);
        font-size: 14px;
      }
      .help-table th,
      .help-table td {
        border: 1px solid var(--rule-faint);
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
      }
      .help-table th {
        background: var(--paper-2);
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ink-3);
      }
      .help-foot {
        margin-top: 40px;
        padding: 20px 22px;
        border: 1.5px solid var(--ink);
        background: var(--paper-2);
        font-family: var(--font-inst);
        font-style: italic;
        font-size: 15px;
        color: var(--ink-2);
      }
      .help-foot a {
        color: var(--accent);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      @media (max-width: 840px) {
        .help-body {
          grid-template-columns: 1fr;
        }
        .help-nav {
          position: static;
          max-height: none;
          overflow: visible;
        }
      }
    `}</style>
  );
}
