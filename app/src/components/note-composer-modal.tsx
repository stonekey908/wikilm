"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  Loader2,
  Plus,
  PenLine,
  Zap,
  Archive,
  Tag as TagIcon,
} from "lucide-react";
import { useProject } from "@/components/project-switcher";
import { useToast } from "@/components/toast-provider";

interface NoteComposerModalProps {
  open: boolean;
  onClose: () => void;
  /** Invoked after a successful submission so the parent can refresh its source list. */
  onSubmitted?: (result: { sourceId: number; status: "pending" | "ingesting"; jobId?: number }) => void;
}

type SaveMode = "pending" | "ingest";

export function NoteComposerModal({
  open,
  onClose,
  onSubmitted,
}: NoteComposerModalProps) {
  const { projects, activeProject } = useProject();
  const { addToast } = useToast();

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [body, setBody] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [mode, setMode] = useState<SaveMode>("pending");
  const [submitting, setSubmitting] = useState(false);

  // Sort projects so the active one is on top and nesting reads naturally.
  const projectOptions = useMemo(() => {
    return [...projects].sort((a, b) => a.slug.localeCompare(b.slug));
  }, [projects]);

  // Reset form each time the modal opens. activeProject is our default.
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setTags([]);
    setTagInput("");
    setBody("");
    setMode("pending");
    setProjectId(activeProject?.id ?? null);
  }, [open, activeProject]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  const addTag = useCallback(() => {
    const cleaned = tagInput.trim().replace(/^#+/, "").toLowerCase();
    if (!cleaned) return;
    setTags((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setTagInput("");
  }, [tagInput]);

  const removeTag = useCallback((t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  }, []);

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length >= 10 &&
    projectId !== null &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || projectId === null) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sources/upload-md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: body,
          tags,
          projectId,
          ingest: mode === "ingest",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as {
        sourceId: number;
        status: "pending" | "ingesting";
        jobId?: number;
      };
      addToast({
        type: "success",
        title: mode === "ingest" ? "Note saved — ingesting" : "Note saved as pending",
        description:
          mode === "ingest"
            ? "Ingest job is running. Check the sidebar for progress."
            : "Find it in the library and hit Ingest when ready.",
      });
      onSubmitted?.(data);
      // Reset the form so the user can author another without reopening.
      setTitle("");
      setBody("");
      setTags([]);
      setTagInput("");
      setMode("pending");
    } catch (err) {
      addToast({
        type: "error",
        title: "Couldn't save note",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, title, body, tags, projectId, mode, addToast, onSubmitted]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lg)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: "var(--orange-dim)" }}
          >
            <PenLine className="w-4 h-4" style={{ color: "var(--orange)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-[650] text-[var(--text-1)]">
              New note
            </div>
            <div className="text-[12px] text-[var(--text-4)]">
              Author a markdown note and drop it into a project.
            </div>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors disabled:opacity-40"
            disabled={submitting}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              placeholder="e.g. Mixture-of-experts performance notes"
              className="w-full px-3 py-2 text-[13px] bg-[var(--bg-1)] border border-[var(--border-input)] rounded-md text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all disabled:opacity-60"
            />
          </div>

          {/* Project + mode row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
                Project
              </label>
              <select
                value={projectId ?? ""}
                onChange={(e) => setProjectId(Number(e.target.value))}
                disabled={submitting || projectOptions.length === 0}
                className="w-full px-3 py-2 text-[13px] bg-[var(--bg-1)] border border-[var(--border-input)] rounded-md text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all disabled:opacity-60"
              >
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.slug}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
                On save
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: "pending", label: "Pending", icon: Archive },
                  { id: "ingest", label: "Ingest now", icon: Zap },
                ] as const).map((m) => {
                  const isActive = mode === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      disabled={submitting}
                      className={`px-2.5 py-2 rounded-md border text-[12px] font-[550] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--text-1)]"
                          : "border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-strong)]"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[22px]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-2)] border border-[var(--border)] text-[11px] text-[var(--text-2)]"
                >
                  <TagIcon className="w-3 h-3 opacity-60" />
                  {t}
                  <button
                    onClick={() => removeTag(t)}
                    disabled={submitting}
                    className="text-[var(--text-4)] hover:text-[var(--red)] ml-0.5"
                    aria-label={`Remove tag ${t}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                disabled={submitting}
                placeholder="Add a tag and press Enter"
                className="flex-1 px-3 py-1.5 text-[13px] bg-[var(--bg-1)] border border-[var(--border-input)] rounded-md text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all disabled:opacity-60"
              />
              <button
                onClick={addTag}
                disabled={submitting || !tagInput.trim()}
                className="px-3 py-1.5 text-[12px] font-[550] rounded-md border border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)] disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">
              Body (markdown)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
              placeholder="Write your note… #headings, **bold**, [[wikilinks]] — all supported by the ingest step."
              className="w-full px-3 py-2 text-[13px] font-mono bg-[var(--bg-1)] border border-[var(--border-input)] rounded-md text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all resize-none min-h-[200px] disabled:opacity-60"
              rows={10}
            />
            <div className="text-[11px] text-[var(--text-4)] mt-1">
              {body.trim().length < 10
                ? `${10 - body.trim().length} more character(s) needed`
                : `${body.length} characters`}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-[12px] font-[550] text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-fg)] text-[12px] font-[600] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : mode === "ingest" ? (
              <Zap className="w-3.5 h-3.5" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
            {mode === "ingest" ? "Save + ingest" : "Save as pending"}
          </button>
        </div>
      </div>
    </div>
  );
}
