"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";

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
    h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    h = h.replace(/\[\[([^\]]+)\]\]/g, (_m, t) => {
      const raw = String(t);
      const pipe = raw.indexOf("|");
      const target = pipe !== -1 ? raw.slice(0, pipe) : raw;
      const label = pipe !== -1 ? raw.slice(pipe + 1) : (raw.split("/").pop() ?? raw).replace(/-/g, " ");
      return `<a class="wikilink" href="/wiki?slug=${encodeURIComponent(target)}">${label}</a>`;
    });
    h = h.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
    return h;
  };

  // Pull fenced code blocks out first so their internals don't get
  // inline-formatted or line-split.
  const codeBlocks: string[] = [];
  md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    const id = codeBlocks.length;
    codeBlocks.push(`<pre><code>${esc(code.replace(/\n+$/, ""))}</code></pre>`);
    return `\u0000CODE${id}\u0000`;
  });

  // Split on blank lines → blocks. Each block becomes a single <p>, <h*>,
  // <ul>, <ol>, or <hr>. Inside a block, single newlines are preserved as
  // <br/> so paragraph text wraps naturally without splitting.
  const blocks = md.split(/\n{2,}/);
  const out: string[] = [];
  for (const raw of blocks) {
    const b = raw.replace(/^\n+|\n+$/g, "");
    if (!b) continue;
    if (/^\u0000CODE(\d+)\u0000$/.test(b.trim())) {
      out.push(b.trim());
      continue;
    }
    if (/^-{3,}$|^_{3,}$|^\*{3,}$/.test(b.trim())) {
      out.push("<hr/>");
      continue;
    }
    const hMatch = b.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch && !b.includes("\n")) {
      const level = hMatch[1].length;
      out.push(`<h${level}>${inline(hMatch[2])}</h${level}>`);
      continue;
    }
    const lines = b.split("\n");
    if (lines.every((l) => /^[-*]\s+/.test(l.trim()))) {
      out.push("<ul>" + lines.map((l) => `<li>${inline(l.trim().replace(/^[-*]\s+/, ""))}</li>`).join("") + "</ul>");
      continue;
    }
    if (lines.every((l) => /^\d+\.\s+/.test(l.trim()))) {
      out.push("<ol>" + lines.map((l) => `<li>${inline(l.trim().replace(/^\d+\.\s+/, ""))}</li>`).join("") + "</ol>");
      continue;
    }
    out.push("<p>" + inline(b).replace(/\n/g, "<br/>") + "</p>");
  }

  // Re-inject code blocks
  return out.join("\n").replace(/\u0000CODE(\d+)\u0000/g, (_m, idx) => codeBlocks[Number(idx)] ?? "");
}

function SalonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const projectId = activeProject?.id ?? null;
  const sessionIdParam = searchParams.get("session");
  const sessionId = sessionIdParam ? Number(sessionIdParam) : null;

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
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
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setStreamText("");
    setStreaming(true);
    persistMessage(sid, "user", text);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/claude/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, projectId, type: "chat" }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
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
              assembled += evt.text;
              setStreamText(assembled);
            }
          } catch {}
        }
      }
      const assistantMsg: Message = { role: "assistant", content: assembled };
      setMessages((p) => [...p, assistantMsg]);
      setStreamText("");
      persistMessage(sid, "assistant", assembled);
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
    if (!sessionId || messages.length < 2) return;
    try {
      const res = await fetch("/api/chat/save-as-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, projectId }),
      });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Saving thread as note — pending" });
    } catch {
      addToast({ type: "error", title: "Couldn't save thread" });
    }
  }

  const isEmpty = messages.length === 0 && !streaming && !streamText;

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
              <span className="who">{m.role === "user" ? "You" : "Claude"}</span>
              <div
                className="bubble"
                dangerouslySetInnerHTML={{ __html: renderBubbleHtml(m.content) }}
              />
            </div>
          ))}
          {streaming && (
            <div className="msg assistant">
              <span className="who">Claude</span>
              <div className="bubble" dangerouslySetInnerHTML={{ __html: renderBubbleHtml(streamText) + '<span class="typing"></span>' }} />
            </div>
          )}
        </div>

        <div className="salon-input">
          <span className="sig">§</span>
          <textarea
            placeholder="Ask Claude about this project…"
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
