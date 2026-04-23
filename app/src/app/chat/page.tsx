"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";
import { buildHelpDigest } from "@/content/help";

// Condensed WikiLM help content — computed once at module load and included
// in every chat turn's system preamble so the model can answer how-to
// questions without the user leaving chat.
const HELP_DIGEST = buildHelpDigest();

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface Session {
  id: number;
  projectId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function renderBubbleHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string): string => {
    let h = esc(s);
    h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
    h = h.replace(/\*\*\*([^*\n]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    h = h.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
    h = h.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
    h = h.replace(/\[\[([^\]]+)\]\]/g, (_m, t) => {
      const raw = String(t);
      const pipe = raw.indexOf("|");
      const target = pipe !== -1 ? raw.slice(0, pipe) : raw;
      const label = pipe !== -1 ? raw.slice(pipe + 1) : (raw.split("/").pop() ?? raw).replace(/-/g, " ");
      return `<a class="wikilink" href="/wiki?slug=${encodeURIComponent(target)}">${label}</a>`;
    });
    h = h.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
    // Auto-link bare URLs
    h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer noopener">$2</a>');
    return h;
  };

  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  const isBlank = (l: string) => l.trim() === "";
  const isHeading = (l: string) => /^#{1,6}\s+/.test(l);
  const isHr = (l: string) => /^(-{3,}|_{3,}|\*{3,})\s*$/.test(l.trim());
  const isUl = (l: string) => /^\s*[-*+]\s+/.test(l);
  const isOl = (l: string) => /^\s*\d+\.\s+/.test(l);
  const isQuote = (l: string) => /^>\s?/.test(l);
  const isFence = (l: string) => /^```/.test(l.trim());
  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    // Blank
    if (isBlank(line)) {
      i++;
      continue;
    }

    // Code fence
    if (isFence(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !isFence(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // HR
    if (isHr(line)) {
      out.push("<hr/>");
      i++;
      continue;
    }

    // Heading
    if (isHeading(line)) {
      const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (m) {
        const level = Math.min(6, m[1].length);
        out.push(`<h${level}>${inline(m[2])}</h${level}>`);
        i++;
        continue;
      }
    }

    // Blockquote
    if (isQuote(line)) {
      const buf: string[] = [];
      while (i < lines.length && isQuote(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Table (simple, pipe-separated)
    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|?\s*[-:| ]+\|/.test(lines[i + 1])) {
      const header = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(
          lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
        );
        i++;
      }
      const th = header.map((c) => `<th>${inline(c)}</th>`).join("");
      const tb = rows
        .map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>")
        .join("");
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`);
      continue;
    }

    // Unordered list
    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i])) {
        const content = lines[i].replace(/^\s*[-*+]\s+/, "");
        // Collect continuation lines (indented or not starting a new block)
        const buf = [content];
        i++;
        while (
          i < lines.length &&
          !isBlank(lines[i]) &&
          !isUl(lines[i]) &&
          !isOl(lines[i]) &&
          !isHeading(lines[i]) &&
          !isFence(lines[i])
        ) {
          buf.push(lines[i].trim());
          i++;
        }
        items.push(`<li>${inline(buf.join(" "))}</li>`);
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i])) {
        const content = lines[i].replace(/^\s*\d+\.\s+/, "");
        const buf = [content];
        i++;
        while (
          i < lines.length &&
          !isBlank(lines[i]) &&
          !isUl(lines[i]) &&
          !isOl(lines[i]) &&
          !isHeading(lines[i]) &&
          !isFence(lines[i])
        ) {
          buf.push(lines[i].trim());
          i++;
        }
        items.push(`<li>${inline(buf.join(" "))}</li>`);
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Paragraph — accumulate until blank line or new block start
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !isHeading(lines[i]) &&
      !isHr(lines[i]) &&
      !isUl(lines[i]) &&
      !isOl(lines[i]) &&
      !isQuote(lines[i]) &&
      !isFence(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join("\n").replace(/\n/g, " "))}</p>`);
  }

  return out.join("\n");
}

function SalonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const projectId = activeProject?.id ?? null;
  const sessionIdParam = searchParams.get("session");
  const sessionId = sessionIdParam ? Number(sessionIdParam) : null;
  const autoPrompt = searchParams.get("q");

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const autoFiredRef = useRef(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  // Load session + messages
  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/chat/sessions/${sessionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        setSession(d.session);
        setMessages(d.messages ?? []);
      })
      .catch(() => {
        if (!cancelled) router.push("/chat");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  // Autoscroll
  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages.length, streamText]);

  const createSession = useCallback(
    async (firstUserMsg: string): Promise<number | null> => {
      if (!projectId) return null;
      const title = firstUserMsg.slice(0, 60) + (firstUserMsg.length > 60 ? "…" : "");
      try {
        const res = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, title }),
        });
        if (!res.ok) throw new Error();
        const d = await res.json();
        window.dispatchEvent(new Event("editorial:chat-sessions-refresh"));
        return d.id;
      } catch {
        return null;
      }
    },
    [projectId]
  );

  const persistMessage = useCallback(async (sid: number, role: "user" | "assistant", content: string) => {
    try {
      await fetch(`/api/chat/sessions/${sid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
    } catch {}
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !projectId) return;

    // Ensure we have a session
    let sid = sessionId;
    if (!sid) {
      const created = await createSession(text);
      if (!created) {
        addToast({ type: "error", title: "Couldn't start conversation" });
        return;
      }
      sid = created;
      router.replace(`/chat?session=${sid}`);
    }

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreamText("");
    setStreaming(true);
    persistMessage(sid, "user", text);

    // Build a multi-turn prompt from the conversation so WikiLM has the
    // prior context. First turn gets a system-like framing; follow-ups
    // are simple Human/Assistant alternation. We also prepend a condensed
    // help digest so the model can answer "how do I use WikiLM?" questions
    // inline with pointers into the /help knowledge bank.
    const CONTEXT_LIMIT = 12; // last N turns to keep the prompt under control
    const kept = history.slice(-CONTEXT_LIMIT);
    const transcript = kept
      .map((m) => (m.role === "user" ? `Human: ${m.content}` : `Assistant: ${m.content}`))
      .join("\n\n");
    const helpPreamble = HELP_DIGEST;
    const wrappedPrompt =
      kept.length === 1
        ? `${helpPreamble}\n\n---\n\n${text}`
        : `${helpPreamble}\n\n---\n\nYou are continuing an ongoing conversation. The full prior transcript is below — treat every Human turn as what the user said and every Assistant turn as what you (the assistant) previously said. Continue the conversation naturally, grounded in the active wiki project.\n\n${transcript}\n\nAssistant:`;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/claude/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: wrappedPrompt, projectId, type: "chat" }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      let streamError: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "content" && typeof evt.text === "string") {
              // The server splits stdout on \n and emits each line as a
              // separate `content` event with the newline stripped. Rejoin
              // with \n so markdown blocks (headings, lists, fences) keep
              // their line boundaries and render correctly.
              assembled += evt.text + "\n";
              setStreamText(assembled);
            } else if (evt.type === "error" && typeof evt.text === "string") {
              // Surface provider errors (e.g. "Ollama streaming isn't supported
              // for chat — pick Claude or Gemini") instead of dropping them.
              streamError = evt.text;
            }
          } catch {}
        }
      }
      if (streamError && !assembled.trim()) {
        addToast({ type: "error", title: "Chat unavailable", description: streamError });
      } else {
        const assistantMsg: Message = { role: "assistant", content: assembled };
        setMessages((p) => [...p, assistantMsg]);
        setStreamText("");
        persistMessage(sid, "assistant", assembled);
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        addToast({ type: "error", title: "Chat stream failed" });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, projectId, sessionId, createSession, persistMessage, router, addToast]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  async function saveAsNote() {
    if (messages.length < 2) return;
    try {
      const res = await fetch("/api/chat/save-as-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          projectId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "save failed");
      }
      addToast({
        type: "success",
        title: "Summarising thread — check Intake",
        description: "A pending source will land when the job finishes.",
      });
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Couldn't save thread",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  const isEmpty = messages.length === 0 && !streaming && !streamText;

  // Auto-fire from palette intent: /chat?q=<topic>
  useEffect(() => {
    if (autoFiredRef.current) return;
    if (!autoPrompt || !projectId) return;
    if (sessionId) return; // don't hijack an existing thread
    autoFiredRef.current = true;
    setInput(autoPrompt);
    // Clear q from URL so reloads don't re-fire
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.pathname + url.search);
    window.setTimeout(() => sendMessage(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt, projectId, sessionId]);

  return (
    <div className="pad">
      <EditorialBreadcrumbs tail="Salon" />

      <div className="salon-toolbar">
        <span className="t">{session?.title ?? "A new conversation"}</span>
        {messages.length >= 2 && (
          <button className="btn sm act" onClick={saveAsNote}>
            Save as note
          </button>
        )}
        {sessionId && (
          <button className="btn sm ghost act" onClick={() => router.push("/chat")}>
            New chat
          </button>
        )}
      </div>

      <div className="salon">
        <div className="salon-thread" ref={threadRef}>
          {isEmpty && (
            <div className="salon-empty">
              <h2>
                Ask <em>anything.</em>
              </h2>
              <p>Grounded in {activeProject?.slug ?? "the active project"}.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <span className="who">{m.role === "user" ? "You" : "WikiLM"}</span>
              <div
                className="bubble"
                dangerouslySetInnerHTML={{ __html: renderBubbleHtml(m.content) }}
              />
            </div>
          ))}
          {streaming && (
            <div className="msg assistant">
              <span className="who">WikiLM</span>
              <div className="bubble" dangerouslySetInnerHTML={{ __html: renderBubbleHtml(streamText) + '<span class="typing"></span>' }} />
            </div>
          )}
        </div>

        <div className="salon-input">
          <span className="sig">§</span>
          <textarea
            placeholder="Ask WikiLM about this project…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            disabled={streaming}
          />
          {streaming ? (
            <button className="send stop" onClick={stop}>
              Stop
            </button>
          ) : (
            <button className="send" onClick={sendMessage} disabled={!input.trim() || !projectId}>
              Send →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <SalonInner />
    </Suspense>
  );
}
