"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import {
  Send,
  Square,
  Globe,
  BookmarkPlus,
  Bot,
  User,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  Clipboard,
  FileDown,
  FileText as FileTextIcon,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { filenameFromMarkdown, markdownToDocumentBlob } from "@/lib/export-docx";

/* ── Markdown helpers ───────────────────────────────────────────── */

/**
 * Very small markdown-to-HTML renderer.
 * Handles headings, bold, italic, inline code, fenced code blocks,
 * unordered/ordered lists, links, horizontal rules, and [[wikilinks]].
 */
function renderMarkdown(md: string): string {
  // Escape HTML entities first
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks (``` ... ```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, lang, code) =>
      `<pre class="code-block" data-lang="${lang}"><code>${code.trimEnd()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="md-hr" />');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // [[wikilinks]]
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_match, page) => {
    const slug = page
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    return `<a href="/wiki?slug=${slug}" class="wikilink">${page}</a>`;
  });

  // Unordered lists (lines starting with - or *)
  html = html.replace(/^(?:[-*] .+\n?)+/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((l) => `<li>${l.replace(/^[-*] /, "")}</li>`)
      .join("");
    return `<ul class="md-ul">${items}</ul>`;
  });

  // Ordered lists (lines starting with 1. 2. etc.)
  html = html.replace(/^(?:\d+\. .+\n?)+/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`)
      .join("");
    return `<ol class="md-ol">${items}</ol>`;
  });

  // Paragraphs — wrap remaining lines not already in a block element
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<blockquote")
      )
        return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");

  return html;
}

/* ── Types ──────────────────────────────────────────────────────── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: number;
  projectId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const PROJECT_ID = 1; // Default project

/* ── Component ──────────────────────────────────────────────────── */

export default function ChatPage() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchAllProjects, setSearchAllProjects] = useState(false);

  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount and session change
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch {
      // silently ignore
    }
  }, []);

  const loadSession = useCallback(async (sessionId: number) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      const loaded: Message[] = data.messages.map(
        (m: { id: number; role: "user" | "assistant"; content: string; createdAt: string }) => ({
          id: String(m.id),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        })
      );
      setMessages(loaded);
      setActiveSessionId(sessionId);
    } catch {
      // silently ignore
    }
  }, []);

  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
  }, []);

  const deleteSession = useCallback(
    async (sessionId: number) => {
      try {
        await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch {
        // silently ignore
      }
      setPendingDelete(null);
    },
    [activeSessionId]
  );

  const saveMessageToDb = useCallback(
    async (sessionId: number, role: string, content: string) => {
      try {
        await fetch(`/api/chat/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, content }),
        });
      } catch {
        // silently ignore
      }
    },
    []
  );

  const createSession = useCallback(
    async (firstMessage: string): Promise<number | null> => {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
      try {
        const res = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: PROJECT_ID, title }),
        });
        if (!res.ok) return null;
        const session = await res.json();
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        return session.id as number;
      } catch {
        return null;
      }
    },
    []
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      // Determine or create session
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = await createSession(trimmed);
      }

      // Save user message to DB
      if (sessionId) {
        await saveMessageToDb(sessionId, "user", trimmed);
      }

      const prompt = trimmed;

      const controller = new AbortController();
      abortRef.current = controller;

      let fullAssistantContent = "";

      try {
        const response = await fetch("/api/claude/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr) as
                | { type: "content"; text: string }
                | { type: "error"; text: string }
                | { type: "done"; code: number };

              if (event.type === "content") {
                fullAssistantContent += event.text + "\n";
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.text + "\n",
                    };
                  }
                  return updated;
                });
              } else if (event.type === "error") {
                fullAssistantContent += `\n\n**Error:** ${event.text}`;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + `\n\n**Error:** ${event.text}`,
                    };
                  }
                  return updated;
                });
              }
              // "done" — streaming complete
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const fallback = "Sorry, something went wrong. Please try again.";
          fullAssistantContent = fullAssistantContent || fallback;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content || fallback,
              };
            }
            return updated;
          });
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);

        // Save assistant message to DB
        if (sessionId && fullAssistantContent.trim()) {
          await saveMessageToDb(sessionId, "assistant", fullAssistantContent.trim());
          fetchSessions(); // refresh timestamps
        }
      }
    },
    [
      input,
      isStreaming,
      searchAllProjects,
      activeSessionId,
      createSession,
      saveMessageToDb,
      fetchSessions,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ─── Export helpers ─────────────────────────────────────────────
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke so the download actually starts
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const copyMarkdown = useCallback(
    async (content: string) => {
      try {
        await navigator.clipboard.writeText(content);
        addToast({ type: "success", title: "Copied as Markdown" });
      } catch {
        addToast({
          type: "error",
          title: "Copy failed",
          description: "Clipboard unavailable in this browser.",
        });
      }
    },
    [addToast]
  );

  const downloadMarkdown = useCallback(
    (content: string) => {
      const filename = filenameFromMarkdown(content, "md");
      downloadBlob(new Blob([content], { type: "text/markdown" }), filename);
      addToast({ type: "success", title: "Downloaded", description: filename });
    },
    [addToast, downloadBlob]
  );

  const downloadDocx = useCallback(
    async (content: string) => {
      try {
        const blob = await markdownToDocumentBlob(content);
        const filename = filenameFromMarkdown(content, "docx");
        downloadBlob(blob, filename);
        addToast({ type: "success", title: "Downloaded", description: filename });
      } catch (err) {
        addToast({
          type: "error",
          title: "DOCX export failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    [addToast, downloadBlob]
  );

  const saveToWiki = useCallback(
    async (message: Message) => {
      // Find the user question that preceded this answer
      const idx = messages.findIndex((m) => m.id === message.id);
      const userMessage = idx > 0 ? messages[idx - 1] : null;
      const question =
        userMessage?.role === "user" ? userMessage.content : "Untitled query";

      const slug = question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 60);

      const date = new Date().toISOString().split("T")[0];
      const tags = "chat-query";

      const fileContent = `---
type: query
question: "${question.replace(/"/g, '\\"')}"
date: "${date}"
tags: [${tags}]
---

${message.content}`;

      const prompt = `Save this as a query page wiki/queries/${slug}.md:\n\n${fileContent}`;

      try {
        const response = await fetch("/api/claude/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (response.ok) {
          alert("Saved to wiki as a query page.");
        }
      } catch {
        alert("Failed to save to wiki.");
      }
    },
    [messages]
  );

  return (
    <div className="flex h-full">
      {/* ── Session sidebar ──────────────────────────────────────── */}
      <div className="w-[200px] shrink-0 bg-[var(--bg-1)] border-r border-[var(--border)] flex flex-col h-full">
        <div className="p-3 border-b border-[var(--border)]">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium bg-[var(--primary)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-[var(--text-4)]">
              No conversations yet
            </div>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group relative flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors duration-100 ${
                activeSessionId === session.id
                  ? "bg-[var(--bg-active)]"
                  : "hover:bg-[var(--bg-2)]"
              }`}
              onClick={() => loadSession(session.id)}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--text-4)]" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[var(--text-1)] truncate leading-tight">
                  {session.title}
                </p>
                <p className="text-[11px] text-[var(--text-4)] mt-0.5">
                  {relativeTime(session.updatedAt)}
                </p>
              </div>

              {/* Delete button */}
              {pendingDelete === session.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="text-[11px] text-red-500 font-medium hover:text-red-600"
                  >
                    Yes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(null);
                    }}
                    className="text-[11px] text-[var(--text-4)] font-medium hover:text-[var(--text-2)]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-[var(--text-4)] hover:text-red-500 transition-all duration-150"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="shrink-0 px-8 pt-8 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between max-w-[960px]">
            <div>
              <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
                Chat
              </h1>
              <p className="text-sm text-[var(--text-3)] mt-1">
                Ask questions about your knowledge base
              </p>
            </div>
            {/* Cross-project toggle */}
            <button
              onClick={() => setSearchAllProjects((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-150 ${
                searchAllProjects
                  ? "bg-[var(--primary-dim)] border-[var(--primary)] text-[var(--primary)]"
                  : "bg-[var(--bg-1)] border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-2)]"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Search all projects
            </button>
          </div>
        </div>

        {/* ── Messages area ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[960px] space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-[var(--text-4)]">
                <Bot className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-[15px] font-medium">
                  Ask a question about your wiki
                </p>
                <p className="text-[13px] mt-1 text-[var(--text-4)]">
                  Responses are grounded in your knowledge base
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-md bg-[var(--bg-2)] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[var(--text-3)]" />
                  </div>
                )}

                <div
                  className={`max-w-[75%] ${
                    msg.role === "user"
                      ? "bg-[var(--primary)] text-[var(--primary-fg)] rounded-2xl rounded-br-md px-4 py-2.5"
                      : "bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3 shadow-[var(--shadow-sm)]"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="text-[14px] leading-relaxed">
                      {msg.content ? (
                        <div
                          className="markdown-body"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(msg.content),
                          }}
                        />
                      ) : (
                        isStreaming && (
                          <span className="inline-flex items-center gap-1.5 text-[var(--text-4)]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Thinking...
                          </span>
                        )
                      )}
                      {/* Blinking cursor during streaming */}
                      {isStreaming &&
                        msg.content &&
                        msg.id === messages[messages.length - 1]?.id && (
                          <span className="inline-block w-[2px] h-[1em] bg-[var(--primary)] ml-0.5 animate-pulse align-text-bottom" />
                        )}
                    </div>
                  )}

                  {/* Assistant message footer: save + export */}
                  {msg.role === "assistant" && msg.content && !isStreaming && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center flex-wrap gap-x-4 gap-y-1">
                      <button
                        onClick={() => saveToWiki(msg)}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-4)] hover:text-[var(--primary)] transition-colors duration-150"
                      >
                        <BookmarkPlus className="w-3 h-3" />
                        Save to wiki
                      </button>
                      <button
                        onClick={() => copyMarkdown(msg.content)}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-4)] hover:text-[var(--primary)] transition-colors duration-150"
                        title="Copy response as Markdown"
                      >
                        <Clipboard className="w-3 h-3" />
                        Copy
                      </button>
                      <button
                        onClick={() => downloadMarkdown(msg.content)}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-4)] hover:text-[var(--primary)] transition-colors duration-150"
                        title="Download as Markdown file"
                      >
                        <FileTextIcon className="w-3 h-3" />
                        .md
                      </button>
                      <button
                        onClick={() => downloadDocx(msg.content)}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-4)] hover:text-[var(--primary)] transition-colors duration-150"
                        title="Download as Word (.docx)"
                      >
                        <FileDown className="w-3 h-3" />
                        .docx
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-[var(--primary-fg)]" />
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input area ─────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-0)] px-8 py-4">
          <form
            onSubmit={sendMessage}
            className="max-w-[960px] flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your wiki..."
                rows={1}
                className="w-full resize-none rounded-lg border border-[var(--border-input)] bg-[var(--bg-1)] px-4 py-2.5 text-[14px] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-150"
                style={{
                  minHeight: "42px",
                  maxHeight: "160px",
                  height: "auto",
                  overflow: "auto",
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 160) + "px";
                }}
                disabled={isStreaming}
              />
            </div>

            {isStreaming ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="flex items-center justify-center w-[42px] h-[42px] rounded-lg bg-[var(--red)] text-white hover:opacity-90 transition-opacity duration-150 shrink-0"
                title="Stop generating"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex items-center justify-center w-[42px] h-[42px] rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
          <p className="max-w-[960px] text-[11px] text-[var(--text-4)] mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Markdown styles ────────────────────────────────────── */}
      <style jsx global>{`
        .markdown-body p {
          margin-bottom: 0.5em;
        }
        .markdown-body p:last-child {
          margin-bottom: 0;
        }
        .markdown-body .md-h1 {
          font-size: 1.25em;
          font-weight: 700;
          margin: 0.75em 0 0.25em;
        }
        .markdown-body .md-h2 {
          font-size: 1.1em;
          font-weight: 650;
          margin: 0.6em 0 0.2em;
        }
        .markdown-body .md-h3 {
          font-size: 1em;
          font-weight: 600;
          margin: 0.5em 0 0.15em;
        }
        .markdown-body .md-h4 {
          font-size: 0.95em;
          font-weight: 600;
          margin: 0.4em 0 0.1em;
        }
        .markdown-body strong {
          font-weight: 650;
        }
        .markdown-body em {
          font-style: italic;
        }
        .markdown-body .code-block {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 16px;
          overflow-x: auto;
          margin: 0.5em 0;
          font-family: var(--font-mono);
          font-size: 0.85em;
          line-height: 1.5;
        }
        .markdown-body .inline-code {
          background: var(--bg-2);
          border-radius: 4px;
          padding: 0.15em 0.4em;
          font-family: var(--font-mono);
          font-size: 0.88em;
        }
        .markdown-body .md-ul,
        .markdown-body .md-ol {
          margin: 0.4em 0;
          padding-left: 1.5em;
        }
        .markdown-body .md-ul {
          list-style-type: disc;
        }
        .markdown-body .md-ol {
          list-style-type: decimal;
        }
        .markdown-body .md-ul li,
        .markdown-body .md-ol li {
          margin: 0.15em 0;
        }
        .markdown-body .md-link {
          color: var(--primary);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .markdown-body .md-link:hover {
          color: var(--primary-hover);
        }
        .markdown-body .wikilink {
          color: var(--primary);
          text-decoration: none;
          font-weight: 550;
          border-bottom: 1px dashed var(--primary);
          padding-bottom: 0.5px;
        }
        .markdown-body .wikilink:hover {
          color: var(--primary-hover);
          border-bottom-style: solid;
        }
        .markdown-body .md-hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 0.75em 0;
        }
      `}</style>
    </div>
  );
}
