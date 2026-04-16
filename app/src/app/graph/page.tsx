"use client";

import { Share2 } from "lucide-react";

export default function GraphPage() {
  return (
    <div className="p-8 max-w-[960px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
          Graph
        </h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Visual map of wiki connections
        </p>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-24 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)]">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: "var(--primary-dim)" }}
        >
          <Share2 className="w-7 h-7" style={{ color: "var(--primary)" }} />
        </div>
        <h2 className="text-[15px] font-[600] text-[var(--text-1)] mb-1.5">
          Graph visualization coming soon
        </h2>
        <p className="text-[13px] text-[var(--text-3)] max-w-sm text-center">
          An interactive force-directed graph will show how your wiki pages,
          entities, and concepts connect to each other.
        </p>
      </div>
    </div>
  );
}
