"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast-provider";

/**
 * Mirrors the existing Toast system's toasts into an editorial-styled
 * singleton at the bottom-center of the screen (mono uppercase, ink-bg,
 * paper-fg). We subscribe to the existing context rather than replace it —
 * every legacy `addToast` call from Ledger/Intake/etc. already works; this
 * just re-renders the *visual* in editorial mode.
 */
export function EditorialToastBridge() {
  const ctx = useToast() as unknown as {
    toasts?: { id: string; type?: string; title: string; description?: string }[];
  };
  // Our existing ToastProvider exposes an array via context — grab the
  // latest one and render an editorial replica. If the context shape
  // doesn't match, render nothing rather than crash.
  const toasts = Array.isArray(ctx.toasts) ? ctx.toasts : [];
  const latest = toasts[toasts.length - 1];
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (!latest) return;
    if (latest.id === visibleKey) return;
    setVisibleKey(latest.id);
    setShowing(true);
    const t = window.setTimeout(() => setShowing(false), 1800);
    return () => window.clearTimeout(t);
  }, [latest, visibleKey]);

  if (!latest) return null;
  const msg = latest.description ? `${latest.title} · ${latest.description}` : latest.title;
  return (
    <div className={`ed-toast${showing ? " show" : ""}${latest.type === "error" ? " error" : ""}`}>
      <span className="d" />
      <span className="msg">{msg}</span>
    </div>
  );
}
