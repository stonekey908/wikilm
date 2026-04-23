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

interface OutputEntry {
  slug: string;          // e.g. "outputs/2026-04-19-cheat"
  title: string;
  tags: string[];
  updatedAt: string;
  format: OutputTypeId;  // inferred from slug
  baseSlug: string;      // tail after "outputs/", used for delete + download
}

// Map the output filename convention back to its format id so we can show the
// right label + pick the right companion extensions. Generated filenames look
// like "YYYY-MM-DD-HHMM-<format>[-<focus-slug>]" (see lib/output-types.ts).
function inferFormat(baseSlug: string): OutputTypeId {
  if (/(^|-)infographic(-|$)/.test(baseSlug)) return "infographic";
  if (/(^|-)deck(-|$)/.test(baseSlug)) return "deck";
  if (/(^|-)cheat(-|$)/.test(baseSlug)) return "cheat";
  if (/(^|-)summary(-|$)/.test(baseSlug)) return "summary";
  if (/(^|-)report(-|$)/.test(baseSlug)) return "report";
  return "report";
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 2) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
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
  const [outputs, setOutputs] = useState<OutputEntry[]>([]);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const jobStartRef = useRef<number>(0);

  const activeFmt = FORMATS.find((f) => f.id === format) ?? FORMATS[0];

  const fetchOutputs = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/wiki?projectId=${projectId}&type=output`);
      if (!res.ok) return;
      const d = (await res.json()) as {
        pages: Array<{ slug: string; title: string; tags: string[]; updatedAt: string }>;
      };
      const rows: OutputEntry[] = (d.pages ?? [])
        .filter((p) => p.slug.startsWith("outputs/"))
        .map((p) => {
          const baseSlugValue = p.slug.replace(/^outputs\//, "");
          return {
            slug: p.slug,
            title: p.title,
            tags: p.tags,
            updatedAt: p.updatedAt,
            format: inferFormat(baseSlugValue),
            baseSlug: baseSlugValue,
          };
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setOutputs(rows);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    fetchOutputs();
    // Cross-page sync — a delete on another page, or a completed generation,
    // should refresh this list.
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: number }>).detail;
      if (!detail?.projectId || detail.projectId === projectId) fetchOutputs();
    };
    window.addEventListener("wikilm:outputs-changed", onChanged);
    return () => window.removeEventListener("wikilm:outputs-changed", onChanged);
  }, [fetchOutputs, projectId]);

  const broadcastOutputsChanged = useCallback(() => {
    if (!projectId) return;
    window.dispatchEvent(
      new CustomEvent("wikilm:outputs-changed", { detail: { projectId } })
    );
  }, [projectId]);

  async function deleteOutput(entry: OutputEntry) {
    if (!projectId) return;
    if (!confirm(`Delete "${entry.title}" and all its companion files? This cannot be undone.`)) {
      return;
    }
    setDeletingSlug(entry.slug);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/outputs/delete?baseSlug=${encodeURIComponent(entry.baseSlug)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { deleted: string[] };
      addToast({
        type: "success",
        title: `Deleted · ${entry.title}`,
        description: `Removed ${body.deleted.length} file${body.deleted.length === 1 ? "" : "s"}.`,
      });
      // Optimistically remove so the row disappears before the refetch arrives
      setOutputs((prev) => prev.filter((o) => o.slug !== entry.slug));
      broadcastOutputsChanged();
    } catch {
      addToast({ type: "error", title: "Couldn't delete output" });
    } finally {
      setDeletingSlug(null);
    }
  }

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
          if (j.status === "completed") {
            // New output just landed — refresh both this list and any other
            // page that's listening (e.g. /wiki).
            broadcastOutputsChanged();
            return;
          }
          if (j.status === "failed" || j.status === "cancelled") {
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
  }, [jobId, broadcastOutputsChanged]);

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

        {/* Existing outputs list — mirrors what's in /wiki under "output" type
            but with direct download + delete affordances. Stays in sync with
            the wiki view via the `wikilm:outputs-changed` custom event. */}
        <div className="compose-archive">
          <div className="compose-archive-head">
            <span className="compose-archive-idx">§</span>
            <h2>
              Filed <em>outputs</em>
            </h2>
            <span className="compose-archive-count">{outputs.length}</span>
          </div>

          {outputs.length === 0 ? (
            <p className="compose-archive-empty">
              Nothing filed yet. When you dictate an output above, it lands here and in the Wiki.
            </p>
          ) : (
            <ul className="compose-archive-list">
              {outputs.map((o) => {
                const primaryExt = o.format === "infographic" ? "html" : "md";
                const derivedExts =
                  o.format === "deck"
                    ? ["pdf", "pptx"]
                    : o.format === "infographic"
                      ? ["png"]
                      : ["docx"];
                const labelFor = (ext: string) => {
                  if (ext === "md") return "MD";
                  if (ext === "html") return "HTML";
                  return ext.toUpperCase();
                };
                const href = (ext: string) =>
                  `/api/projects/${projectId}/outputs/download?file=${encodeURIComponent(o.baseSlug + "." + ext)}`;
                const fmtLabel =
                  FORMATS.find((f) => f.id === o.format)?.label ?? o.format;
                return (
                  <li key={o.slug} className="compose-archive-row">
                    <div className="compose-archive-meta">
                      <span className={`compose-archive-pill acc-${o.format}`}>{fmtLabel}</span>
                      <span className="compose-archive-when">{formatRelative(o.updatedAt)}</span>
                    </div>
                    <div className="compose-archive-title">{o.title}</div>
                    <div className="compose-archive-slug">{o.baseSlug}</div>
                    <div className="compose-archive-actions">
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() =>
                          router.push(`/wiki?slug=${encodeURIComponent(o.slug)}`)
                        }
                      >
                        Open
                      </button>
                      <a
                        className="btn sm primary"
                        href={href(primaryExt)}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {labelFor(primaryExt)}
                      </a>
                      {derivedExts.map((ext) => (
                        <a
                          key={ext}
                          className="btn sm ghost"
                          href={href(ext)}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {labelFor(ext)}
                        </a>
                      ))}
                      <button
                        type="button"
                        className="btn sm red"
                        onClick={() => deleteOutput(o)}
                        disabled={deletingSlug === o.slug}
                      >
                        {deletingSlug === o.slug ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <style jsx>{`
        .compose-archive {
          margin-top: 48px;
          padding-top: 20px;
          border-top: 1.5px solid var(--rule);
        }
        .compose-archive-head {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 16px;
        }
        .compose-archive-idx {
          font-family: var(--font-serif);
          font-size: 22px;
          color: var(--ink-4);
          font-style: italic;
        }
        .compose-archive-head h2 {
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          color: var(--ink);
          flex: 1;
        }
        .compose-archive-head h2 em {
          font-family: var(--font-inst);
          font-style: italic;
          color: var(--accent);
          font-weight: 400;
        }
        .compose-archive-count {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--ink-4);
          font-variant-numeric: tabular-nums;
        }
        .compose-archive-empty {
          font-family: var(--font-inst);
          font-style: italic;
          font-size: 14px;
          color: var(--ink-3);
          margin: 0;
          padding: 12px 0;
        }
        .compose-archive-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .compose-archive-row {
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-areas:
            "meta actions"
            "title actions"
            "slug actions";
          gap: 2px 16px;
          padding: 12px 14px;
          border: 1px solid var(--rule-faint);
          background: var(--paper);
          transition: border-color 140ms, box-shadow 140ms;
        }
        .compose-archive-row:hover {
          border-color: var(--ink-3);
          box-shadow: 2px 2px 0 var(--rule-faint);
        }
        .compose-archive-meta {
          grid-area: meta;
          display: flex;
          align-items: baseline;
          gap: 10px;
        }
        .compose-archive-pill {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 2px 7px;
          border: 1px solid var(--ink);
          background: var(--paper);
          color: var(--ink);
        }
        .compose-archive-pill.acc-report { background: var(--accent); color: var(--paper); border-color: var(--accent); }
        .compose-archive-pill.acc-summary { background: var(--paper-2); color: var(--ink-2); }
        .compose-archive-pill.acc-cheat { background: var(--paper-2); color: var(--ink-2); }
        .compose-archive-pill.acc-deck { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .compose-archive-pill.acc-infographic { background: var(--paper); color: var(--accent); border-color: var(--accent); }
        .compose-archive-when {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-4);
        }
        .compose-archive-title {
          grid-area: title;
          font-family: var(--font-serif);
          font-size: 15.5px;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.3;
          margin-top: 2px;
        }
        .compose-archive-slug {
          grid-area: slug;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-4);
          letter-spacing: 0.02em;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .compose-archive-actions {
          grid-area: actions;
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        @media (max-width: 720px) {
          .compose-archive-row {
            grid-template-columns: 1fr;
            grid-template-areas:
              "meta"
              "title"
              "slug"
              "actions";
          }
          .compose-archive-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
