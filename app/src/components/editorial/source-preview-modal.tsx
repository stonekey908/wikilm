"use client";

import { useEffect, useState } from "react";
import { PortalToBody } from "@/components/editorial/portal-to-body";

interface Props {
  open: boolean;
  sourceId: number | null;
  onClose: () => void;
}

interface FilePayload {
  kind: "file";
  filePath: string;
  title: string;
  content: string;
}

interface ExternalPayload {
  kind: "external";
  url: string;
  title: string;
  meta: string | null;
}

type Payload = FilePayload | ExternalPayload;

export function SourcePreviewModal({ open, sourceId, onClose }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal unmounts on close (early-return below), so state resets on each
  // open without explicit cleanup — that keeps this effect setState-free
  // when the modal isn't actively visible.
  useEffect(() => {
    if (!open || sourceId === null) return;
    let cancelled = false;
    fetch(`/api/sources/${sourceId}/raw`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) {
          setError(j.error ?? "Failed to load preview");
        } else {
          setData(j as Payload);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Network error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, sourceId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <PortalToBody>
      <div className="note-modal-bg" onClick={onClose}>
        <div className="note-modal" onClick={(e) => e.stopPropagation()}>
          <div className="note-modal-head">
            <h3>
              Preview <em>source</em>
            </h3>
            <button className="x" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <div className="note-modal-body">
            {error && <div style={{ color: "var(--red, #b91c1c)" }}>{error}</div>}
            {!error && !data && <div style={{ opacity: 0.6 }}>Loading…</div>}
            {data?.kind === "external" && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <strong>{data.title}</strong>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ wordBreak: "break-all" }}
                  >
                    {data.url}
                  </a>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  No local content yet — this URL will be fetched + ingested when you Approve.
                </div>
                {data.meta && (
                  <pre
                    style={{
                      marginTop: 12,
                      maxHeight: "40vh",
                      overflow: "auto",
                      fontSize: 12,
                      background: "var(--surface-2, #f5f5f4)",
                      padding: 10,
                      borderRadius: 4,
                    }}
                  >
                    {data.meta}
                  </pre>
                )}
              </div>
            )}
            {data?.kind === "file" && (
              <div>
                <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.7 }}>
                  <code>{data.filePath}</code> · {data.content.length.toLocaleString()} chars
                </div>
                <pre
                  style={{
                    maxHeight: "60vh",
                    overflow: "auto",
                    fontSize: 13,
                    lineHeight: 1.5,
                    background: "var(--surface-2, #f5f5f4)",
                    padding: 14,
                    borderRadius: 4,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {data.content}
                </pre>
              </div>
            )}
          </div>
          <div className="note-modal-foot">
            <button className="btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </PortalToBody>
  );
}
