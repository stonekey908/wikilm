"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";
import { formatJobError } from "@/lib/error-codes";

type OutputTypeId = "report" | "cheat" | "summary" | "deck" | "infographic";
type Scope = "project" | "subtree";

interface FormatDef {
  id: OutputTypeId;
  label: string;
  accent: string;
  blurb: string;
}

const FORMATS: FormatDef[] = [
  { id: "summary", label: "Executive", accent: "summary", blurb: "One-page brief" },
  { id: "cheat", label: "Cheat sheet", accent: "cheat", blurb: "Print-ready talking points" },
  { id: "report", label: "Long report", accent: "report", blurb: "Full narrative with citations" },
  { id: "deck", label: "Briefing deck", accent: "deck", blurb: "Slides · Marp" },
  { id: "infographic", label: "Infographic", accent: "infographic", blurb: "Single-page visual" },
];

interface Job {
  id: number;
  projectId: number;
  type: string;
  title: string;
  status: string;
  output: string | null;
  error: string | null;
  errorCode: string | null;
  model: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function DictationPage() {
  const router = useRouter();
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const projectId = activeProject?.id ?? null;

  const [nudge, setNudge] = useState("");
  const [format, setFormat] = useState<OutputTypeId>("summary");
  const [scope, setScope] = useState<Scope>("project");
  const [queueing, setQueueing] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [baseSlug, setBaseSlug] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const jobStartRef = useRef<number>(0);

  const activeFmt = FORMATS.find((f) => f.id === format) ?? FORMATS[0];

  async function commission() {
    if (!projectId || queueing) return;
    setQueueing(true);
    setJob(null);
    setJobId(null);
    setBaseSlug(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/outputs/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: format, scope, nudge: nudge.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      const d = await res.json();
      setJobId(d.jobId);
      setBaseSlug(d.baseSlug ?? null);
      jobStartRef.current = Date.now();
      addToast({ type: "success", title: `Dictating · ${activeFmt.label}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to commission";
      addToast({ type: "error", title: msg });
    } finally {
      setQueueing(false);
    }
  }

  // Poll the job
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/claude/job/${jobId}`);
        if (res.ok) {
          const j: Job = await res.json();
          if (!cancelled) setJob(j);
          if (j.status === "completed" || j.status === "failed" || j.status === "cancelled") {
            return;
          }
        }
      } catch {}
      if (!cancelled) window.setTimeout(tick, 2500);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Runtime ticker
  useEffect(() => {
    if (!jobId || (job && (job.status === "completed" || job.status === "failed"))) return;
    const i = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - jobStartRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(i);
  }, [jobId, job?.status]);

  const state: "idle" | "running" | "done" | "failed" = useMemo(() => {
    if (!jobId) return "idle";
    if (!job || job.status === "queued" || job.status === "running") return "running";
    if (job.status === "completed") return "done";
    return "failed";
  }, [jobId, job]);

  async function cancel() {
    if (!jobId) return;
    try {
      await fetch(`/api/claude/job/${jobId}`, { method: "DELETE" });
      addToast({ type: "success", title: "Cancelled" });
    } catch {
      addToast({ type: "error", title: "Couldn't cancel" });
    }
  }

  return (
    <div className="pad">
      <EditorialBreadcrumbs tail="Dictation" />

      <div className="compose-hall">
        <div className="kicker">Section 06 · Dictation</div>
        <h1>
          Ask <em>once.</em>
          <br />
          Read <em>forever.</em>
        </h1>
        <div className="sub">
          Dictate a brief, grounded in <em>{activeProject?.slug ?? "the active project"}</em>.
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-4)",
            margin: "0 0 6px 2px",
          }}
        >
          Focus (optional) · steers what the output emphasises
        </div>
        <div className="compose-input">
          <span className="sigil">§</span>
          <textarea
            placeholder="Leave blank for a general overview, or steer it: “the ethical angle”, “executive-ready only”, “compare to X”…"
            value={nudge}
            onChange={(e) => setNudge(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commission();
              }
            }}
          />
        </div>

        <div className="compose-scope">
          <span>Scope</span>
          <div className="seg">
            <button className={scope === "project" ? "on" : ""} onClick={() => setScope("project")}>
              This project
            </button>
            <button className={scope === "subtree" ? "on" : ""} onClick={() => setScope("subtree")}>
              With children
            </button>
          </div>
        </div>

        <div className="compose-controls">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`fmt-btn${format === f.id ? " on" : ""}`}
              onClick={() => setFormat(f.id)}
              title={f.blurb}
            >
              <span className="h">{f.label}</span>
            </button>
          ))}
          <button
            className="run-btn"
            onClick={commission}
            disabled={queueing || state === "running" || !projectId}
          >
            {queueing ? "Queueing…" : state === "running" ? "Dictating…" : "Dictate →"}
          </button>
        </div>

        <div className={`compose-output${state === "done" ? " ready" : state === "failed" ? " failed" : ""}`}>
          {state === "idle" && (
            <div className="dictating">
              Pick a format above. Claude reads the wiki, writes the artifact, files it to <em>/wiki/outputs</em>.
            </div>
          )}

          {state === "running" && (
            <>
              <div className="artifact-meta">
                <span className="seal acc">
                  <span style={{ animation: "pulse 1.4s infinite" }}>●</span> Streaming
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-4)" }}>
                  {activeFmt.label.toUpperCase()} · {scope === "subtree" ? "SUBTREE" : "PROJECT"} ·{" "}
                  {job?.model?.toUpperCase() ?? "RESOLVING…"}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
                  {elapsed}s
                </span>
              </div>
              <p className="dictating">
                Dictating<span className="typing"></span>
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Streams land in /wiki/outputs as soon as ready. You can safely leave this page — the job keeps
                running in the Dispatch.
              </p>
              <div className="artifact-actions">
                <button className="btn sm red" onClick={cancel}>
                  Cancel
                </button>
                <button className="btn sm ghost" onClick={() => router.push("/jobs")}>
                  See in Dispatch
                </button>
              </div>
            </>
          )}

          {state === "done" && job && baseSlug && (
            <>
              <h4>
                {activeFmt.label} · <em>{nudge || activeProject?.name || "overview"}</em>
              </h4>
              <div className="artifact-meta">
                <span className="seal acc">Ready</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-4)" }}>
                  {baseSlug.toUpperCase()}
                  {job.model ? ` · ${job.model.toUpperCase()}` : ""}
                </span>
              </div>
              <p>
                The artifact has been filed under <b>/wiki/outputs/</b>. Open it in the Wiki, or download the
                companion export.
              </p>
              <div className="artifact-actions">
                <button
                  className="btn"
                  onClick={() => router.push(`/wiki?slug=${encodeURIComponent(`outputs/${baseSlug}`)}`)}
                >
                  Open in Wiki
                </button>
                {(() => {
                  const primaryExt = activeFmt.id === "infographic" ? "html" : "md";
                  const derivedExts: string[] =
                    activeFmt.id === "deck"
                      ? ["pdf", "pptx"]
                      : activeFmt.id === "infographic"
                        ? ["png"]
                        : ["docx"];
                  const labelFor = (ext: string) => {
                    if (ext === "md") return "Markdown";
                    if (ext === "html") return "HTML";
                    return ext.toUpperCase();
                  };
                  const href = (ext: string) =>
                    `/api/projects/${projectId}/outputs/download?file=${encodeURIComponent(baseSlug + "." + ext)}`;
                  return (
                    <>
                      <a className="btn primary" href={href(primaryExt)} target="_blank" rel="noreferrer noopener">
                        Download {labelFor(primaryExt)}
                      </a>
                      {derivedExts.map((ext) => (
                        <a key={ext} className="btn" href={href(ext)} target="_blank" rel="noreferrer noopener">
                          {labelFor(ext)}
                        </a>
                      ))}
                    </>
                  );
                })()}
                <button
                  className="btn ghost"
                  onClick={() => {
                    setJobId(null);
                    setJob(null);
                    setBaseSlug(null);
                    setNudge("");
                  }}
                >
                  Dictate another
                </button>
              </div>
              <div className="foot">FILED · {baseSlug}</div>
            </>
          )}

          {state === "failed" && job && (
            <>
              <h4>Dictation failed.</h4>
              <p>
                <b>{formatJobError(job.errorCode, job.error).title}.</b>{" "}
                {formatJobError(job.errorCode, job.error).description}
              </p>
              <div className="artifact-actions">
                <button className="btn primary" onClick={commission}>
                  Retry
                </button>
                <button className="btn ghost" onClick={() => router.push("/jobs")}>
                  See in Dispatch
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setJobId(null);
                    setJob(null);
                  }}
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
