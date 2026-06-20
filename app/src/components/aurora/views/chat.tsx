"use client";

import { useRef, useState } from "react";
import { MarkdownBody, type RenderOpts } from "@/components/editorial/wiki/markdown-renderer";
import { parseSseJson, readStream, useProjectId } from "../lib";

interface Msg { role: "user" | "assistant"; text: string }

export function ChatView() {
  const projectId = useProjectId();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const opts: RenderOpts = { onWikilinkClick: () => {}, onWikilinkHover: () => {}, onWikilinkLeave: () => {} };

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: prompt }, { role: "assistant", text: "" }]);
    const idx = msgs.length + 1; // index of the assistant message just pushed
    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    const scrollDown = () => { const sc = document.getElementById("aurora-scroll"); if (sc) sc.scrollTop = sc.scrollHeight; };
    try {
      const res = await fetch("/api/claude/stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, projectId: projectId ?? 1 }), signal: ac.signal,
      });
      await readStream(res, (line) => {
        const evt = parseSseJson(line);
        if (!evt) return;
        if (evt.type === "content" && typeof evt.text === "string") {
          setMsgs((m) => m.map((mm, i) => (i === idx ? { ...mm, text: mm.text + evt.text + "\n" } : mm)));
          scrollDown();
        } else if (evt.type === "error" && typeof evt.text === "string") {
          setMsgs((m) => m.map((mm, i) => (i === idx ? { ...mm, text: mm.text + "\n_" + evt.text + "_" } : mm)));
        }
      }, ac.signal);
    } catch {
      setMsgs((m) => m.map((mm, i) => (i === idx ? { ...mm, text: mm.text + "\n_Could not reach the chat stream._" } : mm)));
    }
    setBusy(false);
  };

  return (
    <section className="view active">
      <div className="chat-wrap">
        <div className="chat-msgs">
          {msgs.length === 0 && (
            <div className="empty"><div className="et">Chat with your wiki</div><div className="es">Answers are grounded in your sources and pages.</div></div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "user" : "bot"}`}>
              <div className="av">{m.role === "user" ? "You"[0] : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="8" cy="8" r="3.3" /><path d="M8 1.2v2.2M8 12.6v2.2M1.2 8h2.2M12.6 8h2.2" /></svg>
              )}</div>
              <div className="body">
                <div className="who">{m.role === "user" ? "You" : "wikiLM"}</div>
                <div className="txt">{m.text ? <MarkdownBody body={m.text} opts={opts} /> : <div className="typing"><span /><span /><span /></div>}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="chat-composer">
          <div className="chat-box">
            <input value={input} placeholder="Message wikiLM…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
            <button className="send" onClick={send} disabled={busy}>
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="13" x2="8" y2="3" /><path d="M4 7l4-4 4 4" /></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
