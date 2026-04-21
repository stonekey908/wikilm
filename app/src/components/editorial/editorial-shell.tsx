"use client";

import type { ReactNode } from "react";
import { EditorialSidebar } from "./editorial-sidebar";
import { EditorialTopbar } from "./editorial-topbar";
import { TweaksPanel } from "./tweaks-panel";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { Palette } from "./palette";
import { EditorialToastBridge } from "./editorial-toast-bridge";

export function EditorialShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="app">
        <EditorialSidebar />
        <main className="main">
          <EditorialTopbar />
          <div className="content">
            <div className="view">{children}</div>
          </div>
        </main>
      </div>
      <TweaksPanel />
      <KeyboardShortcuts />
      <Palette />
      <EditorialToastBridge />
    </>
  );
}
