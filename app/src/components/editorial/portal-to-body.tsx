"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into `document.body` so `position: fixed` resolves against
 * the real viewport. Needed because the app's `.content` wrapper applies
 * `zoom: var(--fs-scale)` — `position: fixed` inside a zoomed ancestor
 * calculates from the scaled coordinate space, which pushes modals off-screen
 * when the page is scrolled.
 *
 * Wait for mount on the client before portaling so SSR renders nothing (and
 * hydration doesn't see a mismatch).
 */
export function PortalToBody({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
