"use client";

import { cx } from "../lib";
import type { AuroraTheme, AuroraUI } from "../aurora-shell";

const THEMES: Array<{ id: AuroraTheme; name: string; bg: string; side: string; dot: string }> = [
  { id: "paper", name: "Paper", bg: "#fbfaf7", side: "#f4f3ee", dot: "#20808d" },
  { id: "bright", name: "Bright", bg: "#ffffff", side: "#f6f6f4", dot: "#20808d" },
  { id: "sand", name: "Sand", bg: "#f3ead7", side: "#ece1c9", dot: "#20808d" },
  { id: "slate", name: "Slate", bg: "#eef2f5", side: "#e4eaef", dot: "#2f6fed" },
  { id: "dark", name: "Charcoal", bg: "#191a1a", side: "#1d1f1f", dot: "#34b6c4" },
  { id: "midnight", name: "Midnight", bg: "#0f1420", side: "#131a2a", dot: "#6ea8ff" },
  { id: "monokai", name: "Monokai", bg: "#272822", side: "#1e1f1c", dot: "#a6e22e" },
];
const ACCENTS: Array<[string, string]> = [
  ["teal", "#20808d"], ["blue", "#2f6fed"], ["violet", "#7c5cff"], ["green", "#1f9d57"], ["amber", "#c2750a"], ["pink", "#f92672"],
];

export function SettingsView({ ui, update, onSwitchClassic }: {
  ui: AuroraUI; update: (p: Partial<AuroraUI>) => void; onSwitchClassic: () => void;
}) {
  return (
    <section className="view active">
      <div className="page">
        <div className="page-head"><h1 className="page-title">Settings</h1><p className="page-sub">Tune the Aurora frontend&apos;s appearance</p></div>

        <div className="settings-grid">
          <div className="scard">
            <div className="scard-h">Frontend</div><div className="scard-sub">Switch between the two wikiLM frontends</div>
            <div className="srow"><div><div className="slabel">Use the editorial (Classic) frontend</div><div className="sdesc">The brutalist, print-inspired layout</div></div>
              <div className="sctl"><button className="btn ghost" onClick={onSwitchClassic}>Switch to Classic</button></div></div>
          </div>

          <div className="scard">
            <div className="scard-h">Theme</div><div className="scard-sub">A full palette — background, panels, and text all retint together</div>
            <div className="theme-gallery">
              {THEMES.map((t) => (
                <div key={t.id} className={cx("theme-card", ui.theme === t.id && "on")} onClick={() => update({ theme: t.id })} title={t.name}>
                  <div className="swatch-prev" style={{ background: t.bg }}>
                    <div className="side" style={{ background: t.side }} />
                    <div className="body"><div className="ln" style={{ top: 10, background: t.dot, opacity: 0.9 }} /><div className="ln" style={{ top: 18, width: "40%", background: t.dot, opacity: 0.4 }} /><div className="dot" style={{ background: t.dot }} /></div>
                  </div>
                  <div className="tname">{t.name}<svg className="chk" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3,8 7,12 13,4" /></svg></div>
                </div>
              ))}
            </div>
          </div>

          <div className="scard">
            <div className="scard-h">Appearance</div><div className="scard-sub">Accent, type, and density</div>
            <div className="srow"><div><div className="slabel">Accent color</div><div className="sdesc">Highlights, links, and actions</div></div>
              <div className="sctl"><div className="swatches">
                {ACCENTS.map(([id, hex]) => (
                  <span key={id} className={cx("swatch", ui.accent === id && "on")} style={{ background: hex }} onClick={() => update({ accent: id })} />
                ))}
              </div></div></div>
            <div className="srow"><div><div className="slabel">Typeface</div><div className="sdesc">Interface font</div></div>
              <div className="sctl"><div className="seg-wide">
                {["sans", "system", "serif", "mono"].map((f) => (
                  <button key={f} className={cx(ui.font === f && "on")} onClick={() => update({ font: f })} style={{ textTransform: "capitalize" }}>{f}</button>
                ))}
              </div></div></div>
            <div className="srow"><div><div className="slabel">Density</div><div className="sdesc">Spacing throughout</div></div>
              <div className="sctl"><div className="seg-wide">
                {["cozy", "comfy", "airy"].map((d) => (
                  <button key={d} className={cx(ui.density === d && "on")} onClick={() => update({ density: d })} style={{ textTransform: "capitalize" }}>{d}</button>
                ))}
              </div></div></div>
            <div className="srow"><div><div className="slabel">Paper grain</div><div className="sdesc">Subtle texture over the canvas</div></div>
              <div className="sctl"><div className={cx("toggle", ui.grain && "on")} onClick={() => update({ grain: !ui.grain })} /></div></div>
            <div className="srow"><div><div className="slabel">Collapse sidebar</div><div className="sdesc">More room for reading</div></div>
              <div className="sctl"><div className={cx("toggle", ui.collapsed && "on")} onClick={() => update({ collapsed: !ui.collapsed })} /></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
