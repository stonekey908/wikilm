"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Project {
  id: number;
  name: string;
  slug: string;
}

function ClipInner() {
  const params = useSearchParams();
  const initialUrl = params.get("url") ?? "";
  const initialTitle = params.get("title") ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { kind: "success"; sourceId: number; projectName: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d: { projects: Project[] }) => {
        const list = d.projects ?? [];
        setProjects(list);
        if (list.length > 0) setProjectId(list[0].id);
      })
      .catch(() => {});
  }, []);

  async function clip() {
    if (!url.trim() || !title.trim() || projectId === null) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/sources/ingest-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim(),
          projectId,
          defer: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setResult({ kind: "error", message: j.error ?? `HTTP ${res.status}` });
      } else {
        const proj = projects.find((p) => p.id === projectId);
        setResult({
          kind: "success",
          sourceId: j.sourceId,
          projectName: proj?.name ?? "project",
        });
      }
    } catch (e) {
      setResult({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "60px auto",
        padding: 24,
        fontFamily: "var(--font-inst, system-ui)",
      }}
    >
      <h1 style={{ marginTop: 0, fontSize: 28 }}>
        Clip to <em>WikiLM</em>
      </h1>
      <p style={{ opacity: 0.7, fontSize: 14, marginTop: -4 }}>
        Server fetches the URL fresh, lands as <code>pending</code> in the chosen project.
        Triage from <a href="/sources">Intake</a>.
      </p>

      {result?.kind === "success" ? (
        <div
          style={{
            padding: 18,
            background: "var(--surface-2, #f5f5f4)",
            borderRadius: 6,
            marginTop: 24,
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 6 }}>
            ✓ Clipped to <strong>{result.projectName}</strong>
          </div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Source #{result.sourceId} is pending. Open{" "}
            <a href="/sources">/sources</a> to approve, move, or preview.
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() => window.close()}
              style={{ marginRight: 8 }}
            >
              Close tab
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setResult(null);
                setTitle("");
                setUrl("");
              }}
            >
              Clip another
            </button>
          </div>
        </div>
      ) : (
        <>
          <label style={{ display: "block", marginTop: 18 }}>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Title</div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              style={{ width: "100%", padding: 10, fontSize: 14 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 14 }}>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>URL</div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={submitting}
              style={{ width: "100%", padding: 10, fontSize: 14 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 14 }}>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Project</div>
            <select
              value={projectId ?? ""}
              onChange={(e) => setProjectId(parseInt(e.target.value, 10))}
              disabled={submitting || projects.length === 0}
              style={{ width: "100%", padding: 10, fontSize: 14 }}
            >
              {projects.length === 0 && <option value="">Loading projects…</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {result?.kind === "error" && (
            <div style={{ marginTop: 14, color: "#b91c1c", fontSize: 13 }}>
              {result.message}
            </div>
          )}

          <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn primary"
              onClick={clip}
              disabled={
                submitting || !title.trim() || !url.trim() || projectId === null
              }
            >
              {submitting ? "Clipping…" : "Clip →"}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => window.close()}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ClipPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: 60, textAlign: "center" }}>Loading…</div>}
    >
      <ClipInner />
    </Suspense>
  );
}
