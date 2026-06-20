"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownBody, type RenderOpts } from "@/components/editorial/wiki/markdown-renderer";
import { useProject } from "@/components/project-switcher";
import { cx, parseSseJson, readStream, useProjectId } from "../lib";

interface Session { id: number; title: string; updatedAt?: string; createdAt?: string }
interface Msg { role: "user" | "assistant"; content: string }

function ago(iso?: string): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  const m = s / 60; if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60; if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}
const SUGGESTIONS = ["Summarise this project", "What are the open questions?", "How do the sources connect?"];

export function ChatView() {
  const projectId = useProjectId();
  const { activeProject } = useProject();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const opts: RenderOpts = { onWikilinkClick: () => {}, onWikilinkHover: () => {}, onWikilinkLeave: () => {} };

  const loadSessions = useCallback(() => {
    if (projectId === null) return;
    fetch(`/api/chat/sessions?projectId=${projectId}`).then((r) => r.json())
      .then((d: { sessions?: Session[] }) => setSessions(d.sessions ?? [])).catch(() => {});
  }, [projectId]);

  useEffect(() => { setActiveId(null); setMsgs([]); loadSessions(); }, [loadSessions]);

  const scrollDown = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };
  useEffect(() => { scrollDown(); }, [msgs]);

  const grow = () => {
    const el = taRef.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const openSession = async (id: number) => {
    setActiveId(id);
    const d = await fetch(`/api/chat/sessions/${id}`).then((r) => r.json());
    setMsgs((d.messages ?? []).map((m: Msg) => ({ role: m.role, content: m.content })));
  };
  const newChat = () => { abort.current?.abort(); setActiveId(null); setMsgs([]); setInput(""); taRef.current?.focus(); };
  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" }).catch(() => {});
    if (id === activeId) newChat();
    loadSessions();
  };

  const send = async (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || busy || projectId === null) return;
    setInput(""); if (taRef.current) taRef.current.style.height = "auto";
    setBusy(true);

    // Ensure a session exists.
    let sid = activeId;
    if (sid === null) {
      try {
        const s = await fetch(`/api/chat/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, title: prompt.slice(0, 48) }) }).then((r) => r.json());
        sid = s.id; setActiveId(sid); loadSessions();
      } catch {}
    }
    setMsgs((m) => [...m, { role: "user", content: prompt }, { role: "assistant", content: "" }]);
    const idx = msgs.length + 1;
    if (sid !== null) fetch(`/api/chat/sessions/${sid}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "user", content: prompt }) }).catch(() => {});

    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    let assembled = "";
    try {
      const res = await fetch("/api/claude/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, projectId }), signal: ac.signal });
      await readStream(res, (line) => {
        const evt = parseSseJson(line);
        if (!evt) return;
        if (evt.type === "content" && typeof evt.text === "string") {
          assembled += evt.text + "\n";
          setMsgs((m) => m.map((mm, i) => (i === idx ? { ...mm, content: assembled } : mm)));
          scrollDown();
        } else if (evt.type === "error" && typeof evt.text === "string") {
          assembled += `\n_${evt.text}_`;
          setMsgs((m) => m.map((mm, i) => (i === idx ? { ...mm, content: assembled } : mm)));
        }
      }, ac.signal);
    } catch {
      assembled = assembled || "_Could not reach the chat stream._";
      setMsgs((m) => m.map((mm, i) => (i === idx ? { ...mm, content: assembled } : mm)));
    }
    if (sid !== null && assembled.trim()) {
      fetch(`/api/chat/sessions/${sid}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "assistant", content: assembled }) }).catch(() => {});
    }
    loadSessions();
    setBusy(false);
  };
  const stop = () => { abort.current?.abort(); setBusy(false); };

  return (
    <section className="view active">
      <div className="chat-layout">
        <aside className="chat-rail">
          <button className="chat-new" onClick={newChat}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>
            New chat
          </button>
          <div className="chat-rail-h">{activeProject?.name || "Project"} · {sessions.length} chats</div>
          <div className="chat-sessions">
            {sessions.length === 0 && <div className="chat-rail-empty">No conversations yet.</div>}
            {sessions.map((s) => (
              <div key={s.id} className={cx("chat-sess", s.id === activeId && "active")} onClick={() => openSession(s.id)}>
                <span className="ti">{s.title}</span>
                <span className="ag">{ago(s.updatedAt || s.createdAt)}</span>
                <button className="del" title="Delete" onClick={(e) => deleteSession(s.id, e)}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="chat-main">
          <div className="chat-scroll" ref={scrollRef}>
            <div className="chat-inner">
              {msgs.length === 0 ? (
                <div className="chat-hero">
                  <div className="ch-mark"><svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="8" cy="8" r="3.3" /><path d="M8 1.2v2.2M8 12.6v2.2M1.2 8h2.2M12.6 8h2.2" /></svg></div>
                  <h2>Chat with {activeProject?.name || "your wiki"}</h2>
                  <p>Answers are grounded in this project&apos;s sources and pages.</p>
                  <div className="ch-suggest">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
                </div>
              ) : msgs.map((m, i) => (
                <div key={i} className={cx("msg", m.role === "user" ? "user" : "bot")}>
                  <div className="av">{m.role === "user" ? "Y" : <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="8" cy="8" r="3.3" /><path d="M8 1.2v2.2M8 12.6v2.2M1.2 8h2.2M12.6 8h2.2" /></svg>}</div>
                  <div className="body">
                    <div className="who">{m.role === "user" ? "You" : "wikiLM"}</div>
                    <div className="txt">
                      {m.content ? <MarkdownBody body={m.content} opts={opts} /> : <div className="typing"><span /><span /><span /></div>}
                      {busy && m.role === "assistant" && i === msgs.length - 1 && m.content && <span className="stream-cursor" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-dock">
            <div className="chat-composer2">
              <textarea ref={taRef} value={input} rows={1} placeholder={`Message wikiLM about ${activeProject?.name || "this project"}…`}
                onChange={(e) => { setInput(e.target.value); grow(); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button className={cx("cc-send", busy && "stop")} onClick={() => (busy ? stop() : send())} title={busy ? "Stop" : "Send"}>
                {busy
                  ? <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="4" width="8" height="8" rx="1.5" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="13" x2="8" y2="3" /><path d="M4 7l4-4 4 4" /></svg>}
              </button>
            </div>
            <div className="chat-foot">wikiLM can be wrong — it cites the pages it used. Shift+Enter for a new line.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
