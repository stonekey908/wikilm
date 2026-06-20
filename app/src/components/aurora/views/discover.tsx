"use client";

import { useRef, useState } from "react";
import { MarkdownBody, type RenderOpts } from "@/components/editorial/wiki/markdown-renderer";
import { parseSseJson, readStream, useProjectId } from "../lib";

const SUGGESTIONS = [
  "Summarise the key themes across my wiki",
  "What are the open questions in this project?",
  "Connect the most recent sources I added",
];

export function DiscoverView() {
  const projectId = useProjectId();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const opts: RenderOpts = { onWikilinkClick: () => {}, onWikilinkHover: () => {}, onWikilinkLeave: () => {} };

  const ask = async (q: string) => {
    const prompt = q.trim();
    if (!prompt || streaming) return;
    setQuery(prompt); setAnswer(""); setError(null); setStreaming(true); setInput("");
    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    try {
      const res = await fetch("/api/claude/stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, projectId: projectId ?? 1 }), signal: ac.signal,
      });
      await readStream(res, (line) => {
        const evt = parseSseJson(line);
        if (!evt) return;
        if (evt.type === "content" && typeof evt.text === "string") {
          setAnswer((a) => a + evt.text + "\n");
          const sc = document.getElementById("aurora-scroll");
          if (sc) sc.scrollTop = sc.scrollHeight;
        } else if (evt.type === "error" && typeof evt.text === "string") {
          setError(evt.text);
        }
      }, ac.signal);
    } catch {
      setError("Could not reach the answer stream.");
    }
    setStreaming(false);
  };

  if (query === null) {
    return (
      <section className="view active">
        <div className="home">
          <span className="hero-badge"><span className="pip" /> Connected to your wiki</span>
          <h1 className="hero-title">Ask <span className="grad">wikiLM</span></h1>
          <p className="hero-sub">Search across your sources and wiki — answers cite the pages they came from.</p>
          <div className="composer-wrap">
            <div className="composer">
              <textarea className="composer-input" rows={1} value={input} placeholder="Ask a question about your knowledge base…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }} />
              <div className="composer-bar">
                <div className="focus-pills"><button className="pill on">Wiki</button></div>
                <div className="composer-actions">
                  <button className="send" onClick={() => ask(input)}>
                    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="13" x2="8" y2="3" /><path d="M4 7l4-4 4 4" /></svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => <div key={s} className="suggest" onClick={() => ask(s)}>{s}</div>)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view active">
      <div className="thread">
        <div className="q-head"><h1>{query}</h1></div>
        <div className="answer-head"><span className="spark"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M8 1l1.8 4.2L14 7l-4.2 1.8L8 13l-1.8-4.2L2 7l4.2-1.8z" /></svg></span><span className="ttl">Answer</span></div>
        <div className="answer">
          {answer ? <MarkdownBody body={answer} opts={opts} /> : !error && <p style={{ color: "var(--text-3)" }}>Thinking…</p>}
          {streaming && <span className="stream-cursor" />}
          {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        </div>
      </div>
      <div className="followup">
        <div className="followup-box">
          <input placeholder="Ask a follow-up…" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(input); }} />
          <button className="send" onClick={() => ask(input)}>
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="13" x2="8" y2="3" /><path d="M4 7l4-4 4 4" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
