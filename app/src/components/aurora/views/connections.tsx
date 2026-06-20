"use client";

import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { cx } from "../lib";

export function ConnectionsView() {
  const { addToast } = useToast();
  const [mcp, setMcp] = useState(true);
  const toast = (title: string, description?: string) => addToast({ type: "success", title, description });

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
            <div><div className="intg-name">Claude API <span className="intg-status on">Connected</span></div>
              <div className="intg-desc">Use your own Anthropic API key and model instead of a Claude subscription. Powers answers, chat, and synthesis.</div></div>
            <div className="intg-actions"><button className="btn ghost" onClick={() => toast("Tested — key valid")}>Test</button></div>
          </div>
          <div className="intg-config">
            <div className="intg-field"><label>API key</label><input className="intg-input" type="password" defaultValue="sk-ant-api03-•••••••••••••••" onBlur={() => toast("API key saved")} /></div>
            <div className="intg-field"><label>Model</label><div className="select" onClick={() => toast("Model menu")}>Claude Opus 4.8 <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 6.5l3 3 3-3" /></svg></div>
              <span className="intg-note">Falls back to a Claude subscription if no key is set</span></div>
          </div>
        </div>

        {/* MCP */}
        <div className="intg">
          <div className="intg-top">
            <span className="intg-icon" style={{ background: "var(--accent)" }}><svg viewBox="0 0 16 16" fill="none" stroke="var(--accent-fg)" strokeWidth={1.6}><path d="M6.5 9.5l-2 2a2.5 2.5 0 01-3.5-3.5l2-2" /><path d="M9.5 6.5l2-2a2.5 2.5 0 013.5 3.5l-2 2" /><line x1="6" y1="10" x2="10" y2="6" /></svg></span>
            <div><div className="intg-name">MCP connectivity <span className="intg-status on">{mcp ? "Enabled" : "Off"}</span></div>
              <div className="intg-desc">Control wikiLM from Claude Code, Desktop, or the web/mobile app over the Model Context Protocol — and let wikiLM reach other MCP servers (Notion, Tavily) in turn.</div></div>
            <div className="intg-actions"><div className={cx("toggle", mcp && "on")} onClick={() => { setMcp((m) => !m); toast(mcp ? "MCP disabled" : "MCP connectivity enabled"); }} /></div>
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
            <div><div className="intg-name">Tavily <span className={cx("intg-status", mcp ? "avail" : "no")}>{mcp ? "Available" : "Needs MCP"}</span></div>
              <div className="intg-desc">High-quality web search for research runs. Available whenever MCP connectivity is enabled.</div></div>
            <div className="intg-actions"><button className="btn primary" disabled={!mcp} style={{ opacity: mcp ? 1 : 0.5 }} onClick={() => toast("Tavily connected")}>Connect</button></div>
          </div>
          <div className="intg-config">
            <div className="intg-field"><label>API key</label><input className="intg-input" type="password" placeholder="tvly-••••••••••••" /></div>
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
