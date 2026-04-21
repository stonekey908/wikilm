"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FOLIO, VIEW_ORDER } from "./folio-map";

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= VIEW_ORDER.length) {
        e.preventDefault();
        const view = VIEW_ORDER[n - 1];
        router.push(FOLIO[view].path);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
