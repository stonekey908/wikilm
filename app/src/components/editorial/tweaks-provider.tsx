"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Theme = "paper" | "stone" | "celadon" | "night";
export type Accent = "red" | "blue" | "green" | "amber" | "ink";
export type Density = "cozy" | "comfy" | "airy";
export type Size = "sm" | "md" | "lg";
export type FontFace = "fraunces" | "playfair" | "crimson" | "garamond";
export type SidebarState = "open" | "collapsed";

export type TweakState = {
  theme: Theme;
  accent: Accent;
  density: Density;
  size: Size;
  font: FontFace;
  sidebar: SidebarState;
  grain: boolean;
};

const DEFAULTS: TweakState = {
  theme: "paper",
  accent: "green",
  density: "comfy",
  size: "md",
  font: "fraunces",
  sidebar: "open",
  grain: true,
};

const STORAGE_KEY = "wikilm-ed:tweaks";

type Ctx = {
  state: TweakState;
  setTweak: <K extends keyof TweakState>(key: K, value: TweakState[K]) => void;
  panelOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
};

const TweaksContext = createContext<Ctx | undefined>(undefined);

export function useTweaks(): Ctx {
  const ctx = useContext(TweaksContext);
  if (!ctx) throw new Error("useTweaks must be used within a TweaksProvider");
  return ctx;
}

function applyToBody(state: TweakState) {
  if (typeof document === "undefined") return;
  const b = document.body;
  b.dataset.theme = state.theme;
  b.dataset.accent = state.accent;
  b.dataset.density = state.density;
  b.dataset.size = state.size;
  b.dataset.font = state.font;
  b.dataset.side = state.sidebar;
  b.dataset.grain = String(state.grain);
}

export function TweaksProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TweakState>(DEFAULTS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsedRaw = JSON.parse(raw) as Record<string, unknown>;
        // Migrate legacy "carbon" → "night" silently
        if (parsedRaw.theme === "carbon") parsedRaw.theme = "night";
        setState((s) => ({ ...s, ...(parsedRaw as Partial<TweakState>) }));
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    applyToBody(state);
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
    if (typeof window !== "undefined" && window.parent !== window) {
      try {
        window.parent.postMessage({ type: "__edit_mode_set_keys", edits: state }, "*");
      } catch {}
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setPanelOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setPanelOpen(false);
    };
    window.addEventListener("message", handler);

    if (window.parent !== window) {
      try {
        window.parent.postMessage({ type: "__edit_mode_available" }, "*");
      } catch {}
    }

    return () => window.removeEventListener("message", handler);
  }, []);

  const setTweak = useCallback(<K extends keyof TweakState>(key: K, value: TweakState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  const togglePanel = useCallback(() => setPanelOpen((o) => !o), []);
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <TweaksContext.Provider value={{ state, setTweak, panelOpen, togglePanel, openPanel, closePanel }}>
      {children}
    </TweaksContext.Provider>
  );
}
