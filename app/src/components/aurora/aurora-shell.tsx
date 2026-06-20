"use client";

import { useCallback, useEffect, useState } from "react";
import { useTweaks } from "@/components/editorial/tweaks-provider";
import { useProject } from "@/components/project-switcher";
import { cx } from "./lib";
import { DashboardView } from "./views/dashboard";
import { DiscoverView } from "./views/discover";
import { SourcesView } from "./views/sources";
import { WikiView } from "./views/wiki";
import { ChatView } from "./views/chat";
import { JobsView } from "./views/jobs";
import { ConnectionsView } from "./views/connections";
import { SettingsView } from "./views/settings";

export type AuroraView =
  | "home" | "discover" | "sources" | "wiki" | "chat" | "jobs" | "connections" | "settings";

export type AuroraTheme =
  | "paper" | "bright" | "sand" | "slate" | "dark" | "midnight" | "monokai";

export interface AuroraUI {
  theme: AuroraTheme;
  accent: string; // teal | blue | violet | green | amber | pink
  font: string; // sans | system | serif | mono
  density: string; // comfy | cozy | airy
  grain: boolean;
  collapsed: boolean;
}

const DARK = new Set<AuroraTheme>(["dark", "midnight", "monokai"]);
const UI_KEY = "aurora:ui";
const DEFAULT_UI: AuroraUI = {
  theme: "paper", accent: "teal", font: "sans", density: "comfy", grain: false, collapsed: false,
};

export function useAuroraUI() {
  const [ui, setUi] = useState<AuroraUI>(DEFAULT_UI);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UI_KEY);
      if (raw) setUi((u) => ({ ...u, ...(JSON.parse(raw) as Partial<AuroraUI>) }));
    } catch {}
  }, []);
  const update = useCallback((patch: Partial<AuroraUI>) => {
    setUi((u) => {
      const next = { ...u, ...patch };
      try { localStorage.setItem(UI_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return { ui, update };
}

function NavIcon({ d }: { d: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>{d}</svg>
  );
}

const NAV: Array<{ id: AuroraView; label: string; icon: React.ReactNode; badge?: "count" | "run" }> = [
  { id: "home", label: "Home", icon: <><path d="M2.5 7L8 2.5 13.5 7" /><path d="M4 6.5V13h8V6.5" /></> },
  { id: "discover", label: "Discover", icon: <><circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" /></> },
  { id: "sources", label: "Sources", icon: <><path d="M8 1.5v7M4.5 5L8 8.5 11.5 5" /><path d="M2 9.5v3.5h12V9.5" /></>, badge: "count" },
  { id: "wiki", label: "Wiki", icon: <><path d="M3 2h7l3 3v9H3z" /><path d="M10 2v3h3" /><path d="M5.5 7.5h5M5.5 10h3.5" /></> },
  { id: "chat", label: "Chat", icon: <path d="M14 10a1.5 1.5 0 01-1.5 1.5h-7L2 14.5V3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5z" /> },
  { id: "jobs", label: "Jobs", icon: <><circle cx="8" cy="8" r="6.2" /><polyline points="8,4.5 8,8 10.5,9.8" /></>, badge: "run" },
  { id: "connections", label: "Connections", icon: <><path d="M6.5 9.5l-2 2a2.5 2.5 0 01-3.5-3.5l2-2" /><path d="M9.5 6.5l2-2a2.5 2.5 0 013.5 3.5l-2 2" /><line x1="6" y1="10" x2="10" y2="6" /></> },
];

export function AuroraShell() {
  const { setTweak } = useTweaks();
  const { activeProject, projects, setActiveProject } = useProject();
  const { ui, update } = useAuroraUI();
  const [view, setView] = useState<AuroraView>("home");
  const [projOpen, setProjOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const go = useCallback((v: AuroraView) => { setView(v); setDrawer(false); }, []);
  const toggleTheme = () =>
    update({ theme: DARK.has(ui.theme) ? "paper" : "dark" });

  // Close project dropdown on outside click
  useEffect(() => {
    if (!projOpen) return;
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".proj")) setProjOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [projOpen]);

  const isDark = DARK.has(ui.theme);
  const sourceCount = activeProject?.sourceCount ?? 0;

  return (
    <div
      className="aurora-root"
      data-theme={ui.theme}
      data-accent={ui.accent}
      data-font={ui.font === "sans" ? undefined : ui.font}
      data-density={ui.density === "comfy" ? undefined : ui.density}
      data-collapsed={ui.collapsed ? "true" : "false"}
      data-drawer={drawer ? "open" : ""}
      style={{ ["--grain" as string]: ui.grain ? "0.5" : "0" }}
    >
      {/* Frontend switcher */}
      <div className="fe-switch">
        <button className="fe-seg" onClick={() => setTweak("layout", "editorial")} title="Switch to the editorial frontend">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>
          Editorial
        </button>
        <button className="fe-seg active" title="Aurora (current)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M2 11a6 6 0 0112 0" /><path d="M5 11a3 3 0 016 0" /><line x1="2" y1="11" x2="14" y2="11" /></svg>
          Aurora
        </button>
      </div>

      <button className="hamburger" onClick={() => setDrawer((d) => !d)} aria-label="Menu">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}><line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" /></svg>
      </button>
      <div className="scrim" onClick={() => setDrawer(false)} />

      <div className="app">
        <aside className="sidebar">
          <div className="side-top">
            <div className="logo-mark">
              <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.7}><circle cx="8" cy="8" r="3.3" /><path d="M8 1.2v2.2M8 12.6v2.2M1.2 8h2.2M12.6 8h2.2" /></svg>
            </div>
            <span className="logo-text">wikiLM</span>
            <button className="collapse-btn" onClick={() => update({ collapsed: !ui.collapsed })} title="Collapse sidebar">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="2" y="3" width="12" height="10" rx="2" /><line x1="6" y1="3" x2="6" y2="13" /></svg>
            </button>
          </div>

          <button className="new-thread" onClick={() => go("discover")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>
            <span className="label">New thread</span>
          </button>

          <div className="proj">
            <button className="proj-btn" onClick={(e) => { e.stopPropagation(); setProjOpen((o) => !o); }}>
              <span className="proj-dot" style={{ background: activeProject?.color || "var(--accent)" }} />
              <span className="proj-meta">
                <span className="proj-name">{activeProject?.name || "Select project"}</span>
                <span className="proj-sub">{sourceCount} sources · {activeProject?.pageCount ?? 0} pages</span>
              </span>
              <svg className="proj-chev" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 6.5l3 3 3-3" /></svg>
            </button>
            <div className={cx("proj-menu", projOpen && "open")}>
              {projects.map((p) => (
                <div key={p.id} className={cx("proj-item", p.id === activeProject?.id && "active")}
                  onClick={() => { setActiveProject(p); setProjOpen(false); }}>
                  <span className="d" style={{ background: p.color || "var(--accent)" }} />{p.name}
                </div>
              ))}
            </div>
          </div>

          <nav className="nav">
            {NAV.map((n) => (
              <a key={n.id} className={cx("nav-item", view === n.id && "active")} onClick={() => go(n.id)}>
                <NavIcon d={n.icon} />
                <span className="lbl">{n.label}</span>
                {n.badge === "count" && sourceCount > 0 && <span className="badge">{sourceCount}</span>}
              </a>
            ))}
          </nav>

          <div className="side-foot">
            <button className="foot-btn" onClick={toggleTheme}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                {isDark
                  ? <path d="M13.5,9.5 A5.5,5.5 0 1,1 6.5,2.5 A4,4 0 0,0 13.5,9.5" />
                  : <><circle cx="8" cy="8" r="3.3" /><line x1="8" y1="1" x2="8" y2="3" /><line x1="8" y1="13" x2="8" y2="15" /><line x1="1" y1="8" x2="3" y2="8" /><line x1="13" y1="8" x2="15" y2="8" /></>}
              </svg>
              <span className="lbl">{isDark ? "Light mode" : "Dark mode"}</span>
            </button>
            <button className="foot-btn" onClick={() => go("settings")}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="8" cy="8" r="2.3" /><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" /></svg>
              <span className="lbl">Settings</span>
            </button>
          </div>
        </aside>

        <div className="main">
          <div className="scroll" id="aurora-scroll">
            {view === "home" && <DashboardView onNavigate={go} />}
            {view === "discover" && <DiscoverView />}
            {view === "sources" && <SourcesView onOpenWiki={() => go("wiki")} />}
            {view === "wiki" && <WikiView />}
            {view === "chat" && <ChatView />}
            {view === "jobs" && <JobsView />}
            {view === "connections" && <ConnectionsView />}
            {view === "settings" && <SettingsView ui={ui} update={update} onSwitchClassic={() => setTweak("layout", "editorial")} />}
          </div>
        </div>
      </div>
    </div>
  );
}
