"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";

interface Project {
  id: number;
  name: string;
  slug: string;
}

interface Source {
  id: number;
  projectId: number;
  title: string;
  status: string;
}

function ClipInner() {
  const params = useSearchParams();
  const idParam = params.get("id");
  const sourceId = idParam ? parseInt(idParam, 10) : null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [source, setSource] = useState<Source | null>(null);
  const [moveTo, setMoveTo] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [moved, setMoved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d: { projects: Project[] }) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sourceId === null) return;
    fetch(`/api/sources?projectId=1`)
      .then((r) => r.json())
      .then((d: { sources: Source[] }) => {
        const s = (d.sources ?? []).find((x) => x.id === sourceId);
        if (s) {
          setSource(s);
          setMoveTo(s.projectId);
        }
      })
      .catch(() => {});
  }, [sourceId]);

  async function move() {
    if (source === null || moveTo === null || moveTo === source.projectId) {
      // No-op: already in target project.
      const proj = projects.find((p) => p.id === source?.projectId);
      setMoved(proj?.name ?? "default project");
      return;
    }
    setMoving(true);
    try {
      const res = await fetch(`/api/sources/${source.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newProjectId: moveTo }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Move failed");
      }
      const proj = projects.find((p) => p.id === moveTo);
      setMoved(proj?.name ?? "project");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Move failed");
    } finally {
      setMoving(false);
    }
  }

  // No id param → user navigated to /clip directly. Show a friendly hint.
  if (sourceId === null) {
    return (
      <div className="pad">
        <EditorialBreadcrumbs tail="Clip" />
        <div className="sec-head">
          <h1>
            The <em>Clipper.</em>
          </h1>
        </div>
        <p style={{ marginTop: 16, opacity: 0.8 }}>
          This page is the bookmarklet&apos;s landing zone — install the bookmarklet from
          <code>SETUP.md</code> and click it on any webpage to land a pending source here.
        </p>
      </div>
    );
  }

  return (
    <div className="pad">
      <EditorialBreadcrumbs tail="Clip" />
      <div className="sec-head">
        <h1>
          <em>Clipped.</em>
        </h1>
      </div>

      {!source && !error && (
        <p style={{ marginTop: 16, opacity: 0.7 }}>Loading captured source…</p>
      )}

      {source && (
        <div style={{ marginTop: 18 }}>
          <p style={{ fontSize: 16 }}>
            <strong>{source.title}</strong> &mdash; landed as <code>pending</code> in{" "}
            <strong>{projects.find((p) => p.id === source.projectId)?.name ?? "default"}</strong>.
          </p>

          {moved ? (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 16 }}>
                ✓ Saved to <strong>{moved}</strong>.
              </p>
              <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                <a className="btn primary" href="/sources">
                  Open Intake →
                </a>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => window.close()}
                >
                  Close tab
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 24 }}>
              <label style={{ display: "block" }}>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>
                  Keep in default, or move to:
                </div>
                <select
                  value={moveTo ?? ""}
                  onChange={(e) => setMoveTo(parseInt(e.target.value, 10))}
                  disabled={moving || projects.length === 0}
                  style={{ minWidth: 240, padding: 8, fontSize: 14 }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              {error && (
                <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={move}
                  disabled={moving}
                >
                  {moving ? "Saving…" : "Save"}
                </button>
                <a className="btn ghost" href="/sources">
                  Skip → Intake
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClipPage() {
  return (
    <Suspense
      fallback={<div className="pad" style={{ paddingTop: 40 }}>Loading…</div>}
    >
      <ClipInner />
    </Suspense>
  );
}
