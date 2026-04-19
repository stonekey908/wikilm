"use client";

import { useEffect } from "react";
import {
  X,
  Download,
  FileText,
  Sparkles,
  Layers,
  Share2,
  MessageSquare,
  Beaker,
  Clock,
} from "lucide-react";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-8 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-[650] text-[var(--text-1)]">
              How WikiLM works
            </h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              Local-first knowledge base · maintained by an LLM
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-3)] hover:text-[var(--text-1)]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 text-[13px] text-[var(--text-2)] leading-relaxed">
          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-4)] mb-2">
              The idea
            </h3>
            <p>
              Drop raw material into <code className="px-1 py-0.5 rounded bg-[var(--bg-2)] font-mono text-[12px]">raw/</code>,
              the LLM reads it, writes structured markdown into{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--bg-2)] font-mono text-[12px]">wiki/</code>,
              and stitches pages together with{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--bg-2)] font-mono text-[12px]">[[wikilinks]]</code>.
              Knowledge compounds as you add more sources. Every file stays on
              your machine — open the folder in Obsidian any time.
            </p>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-4)] mb-2">
              Typical flow
            </h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                <strong>Add a source</strong> — paste a URL, upload a PDF, or
                drop a note from <span className="text-[var(--text-1)]">Sources</span>.
              </li>
              <li>
                <strong>Ingest</strong> — Claude reads it, writes a source
                summary, and creates/updates entity + concept pages. One source
                typically touches 5–15 wiki pages.
              </li>
              <li>
                <strong>Query or explore</strong> — use <span className="text-[var(--text-1)]">Chat</span>{" "}
                to ask questions, or browse the <span className="text-[var(--text-1)]">Wiki</span>{" "}
                and <span className="text-[var(--text-1)]">Graph</span> directly.
              </li>
              <li>
                <strong>Generate outputs</strong> — from any wiki page, click{" "}
                <span className="text-[var(--text-1)]">Generate output</span>{" "}
                to produce a report, cheat sheet, summary, deck, or infographic.
              </li>
              <li>
                <strong>Lint</strong> — run <span className="text-[var(--text-1)]">Lint</span>{" "}
                periodically to find orphan pages, missing links, and stale
                claims.
              </li>
            </ol>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-4)] mb-2">
              Pages in the sidebar
            </h3>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 opacity-60 shrink-0" />
                <span>
                  <strong>Wiki</strong> — every markdown page in the active
                  project. Filter by type (source, entity, concept, output…).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="w-4 h-4 mt-0.5 opacity-60 shrink-0" />
                <span>
                  <strong>Sources</strong> — raw material. Ingest pending
                  sources, research new ones via web, upload your own.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-0.5 opacity-60 shrink-0" />
                <span>
                  <strong>Chat</strong> — free-form Q&amp;A scoped to the
                  active project&apos;s wiki.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 opacity-60 shrink-0" />
                <span>
                  <strong>Jobs</strong> — every Claude subprocess (ingest,
                  synthesis, lint, research, output) with status + model. Click
                  the footer to slide up a live panel.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Share2 className="w-4 h-4 mt-0.5 opacity-60 shrink-0" />
                <span>
                  <strong>Graph</strong> — visual map of pages and wikilinks.
                  Toggle subtree mode to see a single page&apos;s neighborhood.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Beaker className="w-4 h-4 mt-0.5 opacity-60 shrink-0" />
                <span>
                  <strong>Lint</strong> — health check for the wiki. Surfaces
                  orphans, broken links, promotion candidates, recurring themes.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-4)] mb-2">
              <Sparkles className="w-3.5 h-3.5 inline -mt-0.5 mr-1 opacity-60" />
              Output generation
            </h3>
            <p className="mb-2">
              Five artifact types, each tuned for a different audience:
            </p>
            <ul className="grid grid-cols-1 gap-1 ml-1">
              <li><strong>Report</strong> — long-form `.md` + `.docx` with citations</li>
              <li><strong>Executive summary</strong> — 1-page brief for stakeholders</li>
              <li><strong>Cheat sheet</strong> — scannable reference card</li>
              <li><strong>Deck</strong> — Marp-rendered slides (`.pdf` + `.pptx`)</li>
              <li><strong>Infographic</strong> — single-page HTML + PNG</li>
            </ul>
            <p className="mt-2">
              Pick <strong>scope</strong> (this page or whole subtree) and
              optionally <strong>nudge</strong> the prompt (audience, tone,
              focus). Outputs appear in the wiki and can be deleted with the
              trash icon.
            </p>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-4)] mb-2">
              <Layers className="w-3.5 h-3.5 inline -mt-0.5 mr-1 opacity-60" />
              Nested projects
            </h3>
            <p>
              Organize multiple wikis under one tree (e.g.{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--bg-2)] font-mono text-[12px]">ai/llms</code>,{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--bg-2)] font-mono text-[12px]">coding/codeview</code>).
              Cross-project wikilinks resolve. Parent projects get their own
              synthesis rolled up from children. Use the{" "}
              <strong>project switcher</strong> at the top of the sidebar.
            </p>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-4)] mb-2">
              Tips
            </h3>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Jobs can be cancelled anytime from the footer panel or Jobs page.</li>
              <li>
                The model used for every job is recorded so you can review
                provenance later.
              </li>
              <li>
                Wikilinks use{" "}
                <code className="px-1 py-0.5 rounded bg-[var(--bg-2)] font-mono text-[12px]">[[slug]]</code>{" "}
                or{" "}
                <code className="px-1 py-0.5 rounded bg-[var(--bg-2)] font-mono text-[12px]">[[project/slug]]</code>{" "}
                for cross-project refs.
              </li>
              <li>
                The MCP server lets Claude Code access your wiki from any
                terminal session — see <code className="px-1 py-0.5 rounded bg-[var(--bg-2)] font-mono text-[12px]">mcp/README.md</code>.
              </li>
            </ul>
          </section>

          <section className="pt-2 border-t border-[var(--border)]">
            <p className="text-[12px] text-[var(--text-3)]">
              Based on Andrej Karpathy&apos;s{" "}
              <a
                href="https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                LLM wiki gist
              </a>
              . Extended with nested projects, output generation, and an MCP
              server.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-[550] rounded-md bg-[var(--primary)] text-white hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
