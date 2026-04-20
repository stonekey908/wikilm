"use client";

import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { useProject } from "@/components/project-switcher";

interface Job {
  id: number;
  type: string;
  title: string;
  status: string;
  progress: string | null;
  model: string | null;
  createdAt: string;
}

type Props = { activeJobs: Job[] };

const RESEARCH_KEY = "sb_research_query";

function parseProgress(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.current === "number" && typeof p.total === "number" && p.total > 0) {
      return Math.min(1, Math.max(0, p.current / p.total));
    }
  } catch {}
  return null;
}

function jobRowClass(status: string): string {
  if (status === "running" || status === "queued") return "job-row run";
  if (status === "completed") return "job-row done";
  if (status === "failed" || status === "cancelled") return "job-row fail";
  return "job-row";
}

export function LedgerDispatchResearch({ activeJobs }: Props) {
  const { addToast } = useToast();
  const { activeProject } = useProject();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  async function commission() {
    const q = topic.trim();
    if (!q) return;
    setBusy(true);
    try {
      try {
        localStorage.setItem(RESEARCH_KEY, q);
      } catch {}
      addToast({ type: "success", title: `Commissioning · ${q}`, description: "Visit the Intake to see results." });
      setTopic("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {activeJobs.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--font-inst)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-3)",
            padding: "8px 0 14px",
          }}
        >
          No jobs in flight.
        </div>
      ) : (
        <div>
          {activeJobs.slice(0, 5).map((j) => {
            const pct = parseProgress(j.progress) ?? (j.status === "running" ? 0.4 : 0);
            return (
              <div key={j.id} className={jobRowClass(j.status)}>
                <span className="dot" />
                <div style={{ minWidth: 0 }}>
                  <div className="t">{j.title}</div>
                  <div className="f">
                    {j.type.toUpperCase()}
                    {j.model ? ` · ${j.model.toUpperCase()}` : ""}
                  </div>
                </div>
                <div className="p">
                  <span style={{ transform: `scaleX(${pct})` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="research">
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-4)",
            marginBottom: 8,
          }}
        >
          Commission research
        </div>
        <input
          type="text"
          placeholder="A topic, an open question…"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
              e.preventDefault();
              void commission();
            }
          }}
        />
        <div className="go">
          <button
            className="btn sm primary"
            onClick={() => void commission()}
            disabled={busy || !topic.trim() || !activeProject}
          >
            Commission →
          </button>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-4)",
              letterSpacing: "0.08em",
            }}
          >
            ⌘↵
          </span>
        </div>
        <p className="hint">
          Queues a research pass; grounded drafts appear in <em>the Intake</em>.
        </p>
      </div>
    </>
  );
}
