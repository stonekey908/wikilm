"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";
import { PortalToBody } from "@/components/editorial/portal-to-body";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialTitle?: string;
  initialBody?: string;
  initialTags?: string;
}

export function NoteComposerModal({
  open,
  onClose,
  onSaved,
  initialTitle = "",
  initialBody = "",
  initialTags = "",
}: Props) {
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [tags, setTags] = useState(initialTags);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setBody(initialBody);
      setTags(initialTags);
    }
  }, [open, initialTitle, initialBody, initialTags]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  async function save() {
    const t = title.trim();
    const b = body.trim();
    if (!t || b.length < 10 || !activeProject) {
      addToast({ type: "error", title: "Title + body (≥ 10 chars) required" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sources/upload-md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          content: b,
          tags: tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          projectId: activeProject.id,
          ingest: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "save failed");
      }
      addToast({ type: "success", title: `Note filed · ${t}` });
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Couldn't save note",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <PortalToBody>
    <div className="note-modal-bg" onClick={() => !saving && onClose()}>
      <div className="note-modal" onClick={(e) => e.stopPropagation()}>
        <div className="note-modal-head">
          <h3>
            New <em>note</em>
          </h3>
          <button className="x" onClick={onClose} disabled={saving} aria-label="Close">
            ×
          </button>
        </div>
        <div className="note-modal-body">
          <label className="note-field">
            <span className="lab">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short, distinctive title"
              autoFocus
              disabled={saving}
            />
          </label>
          <label className="note-field">
            <span className="lab">Tags (comma-separated)</span>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="memory, agents, 2026"
              disabled={saving}
            />
          </label>
          <label className="note-field">
            <span className="lab">Body (markdown)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="Write the note. Wikilinks like [[concepts/memory]] are supported. ⌘+Enter to save."
              disabled={saving}
            />
          </label>
        </div>
        <div className="note-modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={saving || !title.trim() || body.trim().length < 10}>
            {saving ? "Filing…" : "File note →"}
          </button>
        </div>
      </div>
    </div>
    </PortalToBody>
  );
}
