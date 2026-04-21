"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { EditorialBreadcrumbs } from "@/components/editorial/wiki/breadcrumbs";
import { useTweaks, type Theme, type Accent, type Density, type Size, type FontFace } from "@/components/editorial/tweaks-provider";

interface OllamaModel { name: string; size?: number }
interface GeminiModel { name: string; label?: string }
interface BackupStatus {
  running: boolean;
  lastStartedAt?: string | null;
  lastCompletedAt?: string | null;
  lastError?: string | null;
}

const JOB_TYPES = [
  { key: "ingest", label: "Ingestion", desc: "Processing raw sources into wiki pages" },
  { key: "research", label: "Research", desc: "Web search for new sources" },
  { key: "synthesis", label: "Synthesis", desc: "Auto-update the project overview" },
  { key: "chat", label: "Chat", desc: "Conversational queries against the wiki" },
  { key: "query", label: "Query", desc: "Direct wiki lookups" },
  { key: "lint", label: "Lint", desc: "Wiki health checks" },
  { key: "fix", label: "Fix", desc: "Applying suggested fixes" },
  { key: "output", label: "Output", desc: "Artifact generation (deck, report, etc.)" },
  { key: "note-summary", label: "Note summary", desc: "Summarise chat as note" },
];

const CLAUDE_MODELS = [
  { value: "haiku", label: "Haiku", desc: "Fastest, cheapest" },
  { value: "sonnet", label: "Sonnet", desc: "Balanced" },
  { value: "opus", label: "Opus", desc: "Best quality" },
];

const THEMES: { v: Theme; label: string }[] = [
  { v: "paper", label: "Cream" },
  { v: "stone", label: "Stone" },
  { v: "celadon", label: "Celadon" },
  { v: "night", label: "Night" },
];

const ACCENTS: { v: Accent; color: string }[] = [
  { v: "red", color: "#b91c1c" },
  { v: "blue", color: "#1e3a8a" },
  { v: "green", color: "#3f6212" },
  { v: "amber", color: "#a16207" },
  { v: "ink", color: "#0f0e0c" },
];

const DENSITIES: { v: Density; label: string }[] = [
  { v: "cozy", label: "Dense" },
  { v: "comfy", label: "Text" },
  { v: "airy", label: "Loose" },
];

const SIZES: { v: Size; label: string }[] = [
  { v: "sm", label: "Sm" },
  { v: "md", label: "Md" },
  { v: "lg", label: "Lg" },
];

const FACES: { v: FontFace; label: string }[] = [
  { v: "fraunces", label: "Signature" },
  { v: "playfair", label: "Masthead" },
  { v: "crimson", label: "Book" },
  { v: "garamond", label: "Classic" },
];

export default function SettingsPage() {
  const { addToast } = useToast();
  const { state: tweakState, setTweak } = useTweaks();

  const [modelSettings, setModelSettings] = useState<Record<string, string>>({});
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([]);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({ running: false });
  const [backupRunning, setBackupRunning] = useState(false);

  // Load settings + provider availability
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setModelSettings(d ?? {}))
      .catch(() => {});
    fetch("/api/ollama/models")
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d) => {
        setOllamaModels(d.models ?? []);
        setOllamaAvailable((d.models ?? []).length > 0);
      })
      .catch(() => {});
    fetch("/api/gemini/models")
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d) => {
        setGeminiModels(d.models ?? []);
        setGeminiAvailable((d.models ?? []).length > 0);
      })
      .catch(() => {});
    fetchBackupStatus();
  }, []);

  const fetchBackupStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/backup/status");
      if (res.ok) {
        const d: BackupStatus = await res.json();
        setBackupStatus(d);
        return d;
      }
    } catch {}
    return null;
  }, []);

  // Poll while backup is running
  useEffect(() => {
    if (!backupRunning && !backupStatus.running) return;
    const i = window.setInterval(async () => {
      const d = await fetchBackupStatus();
      if (d && !d.running && backupRunning) {
        setBackupRunning(false);
        if (d.lastError) {
          addToast({ type: "error", title: "Backup failed", description: d.lastError });
        } else {
          addToast({ type: "success", title: "Backup complete" });
        }
      }
    }, 2000);
    return () => window.clearInterval(i);
  }, [backupRunning, backupStatus.running, fetchBackupStatus, addToast]);

  async function runBackup() {
    setBackupRunning(true);
    addToast({ type: "success", title: "Backup started" });
    try {
      const res = await fetch("/api/backup/run", { method: "POST" });
      if (!res.ok) throw new Error();
      fetchBackupStatus();
    } catch {
      setBackupRunning(false);
      addToast({ type: "error", title: "Backup failed to start" });
    }
  }

  function fmtAgo(iso: string | null | undefined): string {
    if (!iso) return "never";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "never";
    const diff = Date.now() - t;
    const sec = Math.round(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  }

  const saveModel = useCallback(
    async (jobType: string, value: string) => {
      const key = `model:${jobType}`;
      setModelSettings((prev) => ({ ...prev, [key]: value }));
      setSaving(jobType);
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) throw new Error();
        addToast({ type: "success", title: `${jobType} → ${value}` });
      } catch {
        addToast({ type: "error", title: "Couldn't save" });
      } finally {
        setSaving(null);
      }
    },
    [addToast]
  );

  const modelOptions = useMemo(() => {
    const opts: { value: string; label: string; group: string }[] = [];
    for (const c of CLAUDE_MODELS) opts.push({ value: c.value, label: `${c.label} · ${c.desc}`, group: "Claude" });
    for (const o of ollamaModels) opts.push({ value: `ollama:${o.name}`, label: o.name, group: "Ollama (local)" });
    for (const g of geminiModels) opts.push({ value: `gemini:${g.name}`, label: g.label ?? g.name, group: "Gemini" });
    return opts;
  }, [ollamaModels, geminiModels]);

  return (
    <div className="pad">
      <EditorialBreadcrumbs tail="Settings" />

      <div className="sec-head">
        <h1>
          The <em>Press.</em>
        </h1>
        <div className="rail-meta">
          <div>
            <b>{CLAUDE_MODELS.length}</b> Claude
          </div>
          <div>
            <b>{ollamaModels.length}</b> Ollama
          </div>
          <div>
            <b>{geminiModels.length}</b> Gemini
          </div>
        </div>
      </div>

      <div className="settings-grid">
        {/* ── Models ──────────────────────────── */}
        <div className="settings-card" style={{ gridColumn: "1 / -1" }}>
          <h3>
            Models by <em>job type</em>
          </h3>
          <div className="sub">
            Route each job type to a specific model. `ollama:*` runs locally; `gemini:*` shells out to the Gemini CLI;
            bare names are Claude aliases.
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <span className={`avail ${ollamaAvailable ? "ok" : "off"}`}>
              <span className="d" /> Ollama {ollamaAvailable ? "online" : "offline"}
            </span>
            <span className={`avail ${geminiAvailable ? "ok" : "off"}`}>
              <span className="d" /> Gemini {geminiAvailable ? "online" : "offline"}
            </span>
          </div>
          {JOB_TYPES.map((t) => {
            const current = modelSettings[`model:${t.key}`] ?? "sonnet";
            return (
              <div className="setting-row" key={t.key}>
                <div>
                  <div className="k">{t.label}</div>
                  <div className="desc">{t.desc}</div>
                </div>
                <select
                  value={current}
                  onChange={(e) => saveModel(t.key, e.target.value)}
                  disabled={saving === t.key}
                >
                  <optgroup label="Claude">
                    {CLAUDE_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label} · {m.desc}
                      </option>
                    ))}
                  </optgroup>
                  {ollamaModels.length > 0 && (
                    <optgroup label="Ollama (local)">
                      {ollamaModels.map((m) => (
                        <option key={m.name} value={`ollama:${m.name}`}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {geminiModels.length > 0 && (
                    <optgroup label="Gemini">
                      {geminiModels.map((m) => (
                        <option key={m.name} value={`gemini:${m.name}`}>
                          {m.label ?? m.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            );
          })}
        </div>

        {/* ── UI tokens (Tweaks mirror) ──────── */}
        <div className="settings-card">
          <h3>
            <em>Set type</em>
          </h3>
          <div className="sub">Paper + ink + leading. Live across every page.</div>

          <div className="setting-row">
            <div>
              <div className="k">Paper</div>
              <div className="desc">Surface theme</div>
            </div>
            <div className="seg">
              {THEMES.map((t) => (
                <button key={t.v} type="button" className={tweakState.theme === t.v ? "on" : ""} onClick={() => setTweak("theme", t.v)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="k">Ink</div>
              <div className="desc">Accent color</div>
            </div>
            <div className="swatches">
              {ACCENTS.map((a) => (
                <div
                  key={a.v}
                  className={`sw${tweakState.accent === a.v ? " on" : ""}`}
                  style={{ background: a.color }}
                  onClick={() => setTweak("accent", a.v)}
                  role="button"
                  tabIndex={0}
                />
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="k">Face</div>
              <div className="desc">Type family</div>
            </div>
            <div className="seg">
              {FACES.map((f) => (
                <button key={f.v} type="button" className={tweakState.font === f.v ? "on" : ""} onClick={() => setTweak("font", f.v)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="k">Size</div>
              <div className="desc">Global scale</div>
            </div>
            <div className="seg">
              {SIZES.map((s) => (
                <button key={s.v} type="button" className={tweakState.size === s.v ? "on" : ""} onClick={() => setTweak("size", s.v)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="k">Leading</div>
              <div className="desc">Row + section rhythm</div>
            </div>
            <div className="seg">
              {DENSITIES.map((d) => (
                <button key={d.v} type="button" className={tweakState.density === d.v ? "on" : ""} onClick={() => setTweak("density", d.v)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="k">Grain</div>
              <div className="desc">Paper texture overlay</div>
            </div>
            <div
              className={`switch${tweakState.grain ? " on" : ""}`}
              onClick={() => setTweak("grain", !tweakState.grain)}
              role="button"
              tabIndex={0}
            />
          </div>
        </div>

        {/* ── Storage / backup pointers ───────── */}
        <div className="settings-card">
          <h3>
            <em>Storage</em>
          </h3>
          <div className="sub">Backup snapshots + raw paths.</div>
          <div className="setting-row">
            <div>
              <div className="k">Run backup now</div>
              <div className="desc">
                Snapshots wiki/ + projects/ to backups/ as a tarball · Last: <b>{fmtAgo(backupStatus.lastCompletedAt)}</b>
                {backupStatus.lastError ? ` · last error: ${backupStatus.lastError}` : ""}
              </div>
            </div>
            <button
              className="btn primary"
              onClick={runBackup}
              disabled={backupRunning || backupStatus.running}
            >
              {backupRunning || backupStatus.running ? "Running…" : "Run backup"}
            </button>
          </div>
          <div className="setting-row">
            <div>
              <div className="k">Wiki location</div>
              <div className="desc">Project-scoped; see SETUP.md</div>
            </div>
            <span className="sv">
              <b>~/SecondBrain/projects</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
