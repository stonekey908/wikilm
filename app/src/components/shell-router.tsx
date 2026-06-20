"use client";

import type { ReactNode } from "react";
import { useTweaks } from "@/components/editorial/tweaks-provider";
import { EditorialShell } from "@/components/editorial/editorial-shell";
import { AuroraShell } from "@/components/aurora/aurora-shell";

/**
 * Chooses which frontend shell to render based on the shared `layout` tweak.
 * Editorial is the default and keeps receiving the routed page `children`.
 * Aurora is self-contained (it routes its own views internally), so it does
 * not render `children` — the editorial page never mounts in Aurora mode.
 */
export function ShellRouter({ children }: { children: ReactNode }) {
  const { state } = useTweaks();
  if (state.layout === "aurora") return <AuroraShell />;
  return <EditorialShell>{children}</EditorialShell>;
}
