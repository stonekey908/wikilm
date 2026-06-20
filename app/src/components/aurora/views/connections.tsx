"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { cx } from "../lib";

const CLAUDE_MODELS = [
  ["claude-opus-4-8", "Claude Opus 4.8"],
  ["claude-sonnet-4-6", "Claude Sonnet 4.6"],
  ["claude-haiku-4-5", "Claude Haiku 4.5"],
  ["claude-fable-5", "Claude Fable 5"],
];

interface ClaudeStatus { configured: boolean; maskedKey: string | null; model: string }

export function ConnectionsView() {
  const { addToast } = useToast();
  const toast = (title: string, description?: string) => addToast({ type: "success", title, description });

  // ── MCP connectivity (master switch, persisted) ──
  const [mcp, setMcp] = useState(true);
  const toggleMcp = async () => {
    const next = !mcp; setMcp(next);
    await fetch("/api/connections/mcp", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: next }) }).catch(() => {});
    setTavily((t) => ({ ...t, available: next }));
    toast(next ? "MCP connectivity enabled" : "MCP disabled");
  };

  // ── Tavily (web search, gated on MCP) ──
  const [tavily, setTavily] = useState<{ configured: boolean; maskedKey: string | null; available: boolean }>({ configured: false, maskedKey: null, available: true });
  const [tavilyInput, setTavilyInput] = useState("");
  const saveTavily = async () => {
    if (!tavilyInput.trim()) return;
    const r = await fetch("/api/connections/tavily", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: tavilyInput.trim() }) });
    setTavily(await r.json()); setTavilyInput("");
    toast("Tavily connected", "Research runs now use Tavily web search.");
  };
  const testTavily = async () => {
    try {
      const r = await fetch("/api/connections/tavily/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tavilyInput.trim() ? { apiKey: tavilyInput.trim() } : {}) });
      const d = await r.json();
      addToast(d.ok ? { type: "success", title: "Tavily key valid" } : { type: "error", title: "Test failed", description: d.error });
    } catch { addToast({ type: "error", title: "Test failed" }); }
  };

  useEffect(() => {
    fetch("/api/connections/mcp").then((r) => r.json()).then((d) => setMcp(!!d.enabled)).catch(() => {});
    fetch("/api/connections/tavily").then((r) => r.json()).then(setTavily).catch(() => {});
  }, []);

  // ── Claude API (real, persisted via /api/connections/claude) ──
  const [claude, setClaude] = useState<ClaudeStatus>({ configured: false, maskedKey: null, model: "claude-opus-4-8" });
  const [keyInput, setKeyInput] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/connections/claude").then((r) => r.json()).then(setClaude).catch(() => {});
  }, []);

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    const r = await fetch("/api/connections/claude", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: keyInput.trim() }) });
    setClaude(await r.json()); setKeyInput("");
    toast("API key saved", "Claude runs now bill against your key.");
  };
  const saveModel = async (model: string) => {
    const r = await fetch("/api/connections/claude", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model }) });
    setClaude(await r.json());
  };
  const testKey = async () => {
    setTesting(true);
    try {
      const r = await fetch("/api/connections/claude/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(keyInput.trim() ? { apiKey: keyInput.trim() } : {}) });
      const d = await r.json();
      if (d.ok) addToast({ type: "success", title: "Key valid", description: "Authenticated with the Anthropic API." });
      else addToast({ type: "error", title: "Test failed", description: d.error || "Unknown error." });
    } catch { addToast({ type: "error", title: "Test failed", description: "Could not run the test." }); }
    setTesting(false);
  };

  return (
    <section className="view active">
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">Connections</h1>
          <p className="page-sub">Bring wikiLM into your tools — drive it from Claude over MCP, sync to Notion, and let Obsidian draw the graph.</p>
        </div>

        {/* Claude API */}
        <div className="intg">
          <div className="intg-top">
            <span className="intg-icon" style={{ background: "#d97757" }}><svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.7}><path d="M8 1.5l5.5 9.5h-11z" /></svg></span>
            <div><div className="intg-name">Claude API <span className={cx("intg-status", claude.configured ? "on" : "no")}>{claude.configured ? "Connected" : "Not set"}</span></div>
              <div className="intg-desc">Use your own Anthropic API key and model instead of a Claude subscription. Powers answers, chat, and synthesis.</div></div>
            <div className="intg-actions"><button className="btn ghost" disabled={testing} onClick={testKey}>{testing ? "Testing…" : "Test"}</button></div>
          </div>
          <div className="intg-config">
            <div className="intg-field"><label>API key</label>
              <input className="intg-input" type="password" value={keyInput}
                placeholder={claude.maskedKey || "sk-ant-api03-…"}
                onChange={(e) => setKeyInput(e.target.value)} onBlur={saveKey}
                onKeyDown={(e) => { if (e.key === "Enter") saveKey(); }} />
            </div>
            <div className="intg-field"><label>Model</label>
              <select className="intg-input" value={claude.model} onChange={(e) => saveModel(e.target.value)}>
                {CLAUDE_MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
              <span className="intg-note">Falls back to a Claude subscription if no key is set</span></div>
          </div>
        </div>

        {/* MCP */}
        <div className="intg">
          <div className="intg-top">
            <span className="intg-icon" style={{ background: "var(--accent)" }}><svg viewBox="0 0 16 16" fill="none" stroke="var(--accent-fg)" strokeWidth={1.6}><path d="M6.5 9.5l-2 2a2.5 2.5 0 01-3.5-3.5l2-2" /><path d="M9.5 6.5l2-2a2.5 2.5 0 013.5 3.5l-2 2" /><line x1="6" y1="10" x2="10" y2="6" /></svg></span>
            <div><div className="intg-name">MCP connectivity <span className="intg-status on">{mcp ? "Enabled" : "Off"}</span></div>
              <div className="intg-desc">Control wikiLM from Claude Code, Desktop, or the web/mobile app over the Model Context Protocol — and let wikiLM reach other MCP servers (Notion, Tavily) in turn.</div></div>
            <div className="intg-actions"><div className={cx("toggle", mcp && "on")} onClick={toggleMcp} /></div>
          </div>
          <div className="intg-config">
            <div className="intg-field"><label>Server</label><input className="intg-input" defaultValue="wikilm-mcp · node mcp/dist/index.js (stdio)" readOnly /></div>
          </div>
        </div>

        {/* Notion */}
        <div className="intg">
          <div className="intg-top">
            <span className="intg-icon" style={{ background: "#111" }}><svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.4}><rect x="3" y="2.5" width="10" height="11" rx="1" /><path d="M5.5 5.5v5M5.5 5.5l3 5M8.5 5.5v5" /></svg></span>
            <div><div className="intg-name">Notion <span className="intg-status on">Synced</span></div>
              <div className="intg-desc">Two-way sync your wiki to a Notion workspace, so you can read and edit it from Claude on web and mobile.</div></div>
            <div className="intg-actions"><button className="btn ghost" onClick={() => toast("Syncing to Notion…")}>Sync now</button></div>
          </div>
          <div className="intg-config">
            <div className="intg-field"><label>Workspace</label><input className="intg-input" defaultValue="AI Research · /wikiLM (database)" readOnly /></div>
          </div>
        </div>

        {/* Tavily */}
        <div className={cx("intg", !mcp && "off")}>
          <div className="intg-top">
            <span className="intg-icon" style={{ background: "#2f6fed" }}><svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.7}><circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" /></svg></span>
            <div><div className="intg-name">Tavily <span className={cx("intg-status", !mcp ? "no" : tavily.configured ? "on" : "avail")}>{!mcp ? "Needs MCP" : tavily.configured ? "Connected" : "Available"}</span></div>
              <div className="intg-desc">High-quality web search for research runs. Available whenever MCP connectivity is enabled.</div></div>
            <div className="intg-actions"><button className="btn ghost" disabled={!mcp} onClick={testTavily}>Test</button></div>
          </div>
          <div className="intg-config">
            <div className="intg-field"><label>API key</label>
              <input className="intg-input" type="password" value={tavilyInput} disabled={!mcp}
                placeholder={tavily.maskedKey || "tvly-…"}
                onChange={(e) => setTavilyInput(e.target.value)} onBlur={saveTavily}
                onKeyDown={(e) => { if (e.key === "Enter") saveTavily(); }} />
              <span className="intg-note">{mcp ? "Used by research dispatch when set" : "Enable MCP connectivity to use Tavily"}</span></div>
          </div>
        </div>

        {/* Obsidian */}
        <div className="intg">
          <div className="intg-top">
            <span className="intg-icon" style={{ background: "#7c5cff" }}><svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.4}><path d="M8 1.5l4.5 3v7L8 14.5 3.5 11.5v-7z" /><circle cx="8" cy="8" r="1.6" /></svg></span>
            <div><div className="intg-name">Obsidian <span className="intg-status on">Vault linked</span></div>
              <div className="intg-desc">wikiLM exports pages as linked Markdown into an Obsidian vault — so Obsidian&apos;s graph view does the heavy lifting, no in-app graph needed.</div></div>
            <div className="intg-actions"><button className="btn ghost" onClick={() => toast("Exported pages to vault")}>Export now</button></div>
          </div>
          <div className="intg-config">
            <div className="intg-field"><label>Vault path</label><input className="intg-input" defaultValue="~/Obsidian/AI Research" onBlur={() => toast("Vault path saved")} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
