"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/components/toast-provider";
import {
  Sun,
  Moon,
  Monitor,
  Zap,
  Cpu,
  Brain,
  Check,
  Server,
  Archive,
  Loader2,
} from "lucide-react";

interface BackupStatus {
  lastBackupAt: string | null;
  location: string;
  lastDbFile: string | null;
  lastContentFile: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface OllamaModel {
  id: string; // "ollama:qwen2.5-coder:7b"
  name: string;
  contextWindow: number;
}

interface GeminiModel {
  id: string; // "gemini:gemini-3-pro"
  name: string;
  label: string;
}

const themeOptions = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

const models = [
  { value: "haiku", label: "Haiku", icon: Zap, desc: "Fastest, cheapest", color: "var(--green)" },
  { value: "sonnet", label: "Sonnet", icon: Cpu, desc: "Balanced", color: "var(--blue)" },
  { value: "opus", label: "Opus", icon: Brain, desc: "Best quality", color: "var(--primary)" },
];

const operations = [
  { key: "ingest", label: "Ingestion", desc: "Processing raw sources into wiki pages" },
  { key: "research", label: "Research", desc: "Web search for new sources" },
  { key: "synthesis", label: "Synthesis", desc: "Auto-update the project overview after each ingest" },
  { key: "chat", label: "Chat", desc: "Conversational queries against your wiki" },
  { key: "query", label: "Query", desc: "Direct wiki lookups" },
  { key: "lint", label: "Lint", desc: "Wiki health checks and cleanup" },
  { key: "fix", label: "Fix", desc: "Applying suggested fixes to lint findings" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();
  const [modelSettings, setModelSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([]);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupRunning, setBackupRunning] = useState(false);
  // auto_sync_parent_synthesis — when true, a child project's completed
  // synthesis auto-triggers its parent's parent-synthesis (coalesced).
  const [autoSyncParent, setAutoSyncParent] = useState(false);
  const [autoSyncSaving, setAutoSyncSaving] = useState(false);

  const fetchBackupStatus = useCallback(() => {
    fetch("/api/backup/status")
      .then((r) => r.json())
      .then((data: BackupStatus) => setBackupStatus(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const models: Record<string, string> = {};
        for (const op of operations) {
          models[op.key] = data[`model_${op.key}`] ?? "sonnet";
        }
        setModelSettings(models);
        // boolean settings are stored as "true" / "false" strings
        setAutoSyncParent(data.auto_sync_parent_synthesis === "true");
      })
      .catch(() => {});

    // Detect Ollama in parallel
    fetch("/api/ollama/models")
      .then((r) => r.json())
      .then((data: { available: boolean; models: OllamaModel[] }) => {
        setOllamaAvailable(data.available);
        setOllamaModels(data.models ?? []);
      })
      .catch(() => {});

    // Detect Gemini CLI in parallel
    fetch("/api/gemini/models")
      .then((r) => r.json())
      .then((data: { available: boolean; models: GeminiModel[] }) => {
        setGeminiAvailable(data.available);
        setGeminiModels(data.models ?? []);
      })
      .catch(() => {});

    fetchBackupStatus();
  }, [fetchBackupStatus]);

  const runBackup = useCallback(async () => {
    if (backupRunning) return;
    setBackupRunning(true);
    try {
      const res = await fetch("/api/backup/run", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Backup failed");
      }
      const data = await res.json();
      addToast({
        type: "success",
        title: "Backup complete",
        description: `${data.files.db} · ${data.files.content}`,
      });
      fetchBackupStatus();
    } catch (err) {
      addToast({
        type: "error",
        title: "Backup failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBackupRunning(false);
    }
  }, [backupRunning, addToast, fetchBackupStatus]);

  const toggleAutoSyncParent = useCallback(async () => {
    const next = !autoSyncParent;
    setAutoSyncParent(next);
    setAutoSyncSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_sync_parent_synthesis: String(next) }),
      });
    } catch {
      // revert on failure so the UI doesn't lie about persisted state
      setAutoSyncParent(!next);
    } finally {
      setTimeout(() => setAutoSyncSaving(false), 600);
    }
  }, [autoSyncParent]);

  const setModel = useCallback(async (operation: string, model: string) => {
    setModelSettings((prev) => ({ ...prev, [operation]: model }));
    setSaving(operation);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [`model_${operation}`]: model }),
      });
    } catch {
      // ignore
    } finally {
      setTimeout(() => setSaving(null), 600);
    }
  }, []);

  return (
    <div className="p-8 max-w-[960px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
          Settings
        </h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Manage your preferences
        </p>
      </div>

      {/* Model Configuration Section */}
      <section className="mb-8">
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-[600] text-[var(--text-1)]">Model Configuration</h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              Choose which model (Claude or local Ollama) to use for each operation
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {operations.map((op) => {
              const selected = modelSettings[op.key] ?? "sonnet";
              const isOllamaSelected = selected.startsWith("ollama:");
              const isGeminiSelected = selected.startsWith("gemini:");
              return (
                <div key={op.key} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[13px] font-[600] text-[var(--text-1)]">{op.label}</div>
                      <div className="text-[12px] text-[var(--text-3)] mt-0.5">{op.desc}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                      {/* Three uniform-size dropdowns: Claude / Ollama / Gemini.
                          The selected provider shows its chosen model label
                          with primary styling; the others show the provider
                          placeholder. Switching via any dropdown swaps the
                          whole operation to that provider. */}

                      {/* Claude — always visible, three fixed presets */}
                      {(() => {
                        const isClaudeSelected = !isOllamaSelected && !isGeminiSelected;
                        const claudeLabel =
                          models.find((m) => m.value === selected)?.label ?? "Claude";
                        return (
                          <div className="relative w-[130px]">
                            <select
                              value={isClaudeSelected ? selected : ""}
                              onChange={(e) => {
                                if (e.target.value) setModel(op.key, e.target.value);
                              }}
                              className={`w-full flex items-center gap-1.5 pl-7 pr-7 py-1.5 rounded-md border text-[12px] font-[500] transition-all duration-150 cursor-pointer appearance-none ${
                                isClaudeSelected
                                  ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]"
                                  : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-2)]"
                              }`}
                              title="Claude model"
                            >
                              {isClaudeSelected ? (
                                <option value={selected}>{claudeLabel}</option>
                              ) : (
                                <option value="">Claude</option>
                              )}
                              {models
                                .filter((m) => !isClaudeSelected || m.value !== selected)
                                .map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                            </select>
                            <Cpu
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                              style={{
                                color: isClaudeSelected ? "var(--primary)" : "var(--text-3)",
                              }}
                            />
                            {isClaudeSelected && saving === op.key && (
                              <Check className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--green)] pointer-events-none" />
                            )}
                          </div>
                        );
                      })()}

                      {/* Ollama — only if installed */}
                      {ollamaAvailable && ollamaModels.length > 0 && (() => {
                        const ollamaLabel = isOllamaSelected
                          ? ollamaModels.find((m) => m.id === selected)?.name ?? selected.slice(7)
                          : "Ollama";
                        return (
                          <div className="relative w-[130px]">
                            <select
                              value={isOllamaSelected ? selected : ""}
                              onChange={(e) => {
                                if (e.target.value) setModel(op.key, e.target.value);
                              }}
                              className={`w-full flex items-center gap-1.5 pl-7 pr-7 py-1.5 rounded-md border text-[12px] font-[500] transition-all duration-150 cursor-pointer appearance-none ${
                                isOllamaSelected
                                  ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]"
                                  : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-2)]"
                              }`}
                              title="Local Ollama model"
                            >
                              {isOllamaSelected ? (
                                <option value={selected}>{ollamaLabel}</option>
                              ) : (
                                <option value="">Ollama</option>
                              )}
                              {ollamaModels
                                .filter((m) => !isOllamaSelected || m.id !== selected)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                            </select>
                            <Server
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                              style={{
                                color: isOllamaSelected ? "var(--primary)" : "var(--text-3)",
                              }}
                            />
                          </div>
                        );
                      })()}

                      {/* Gemini — only if CLI is installed */}
                      {geminiAvailable && geminiModels.length > 0 && (() => {
                        const geminiLabel = isGeminiSelected
                          ? geminiModels.find((m) => m.id === selected)?.label ?? selected.slice(7)
                          : "Gemini";
                        return (
                          <div className="relative w-[130px]">
                            <select
                              value={isGeminiSelected ? selected : ""}
                              onChange={(e) => {
                                if (e.target.value) setModel(op.key, e.target.value);
                              }}
                              className={`w-full flex items-center gap-1.5 pl-7 pr-7 py-1.5 rounded-md border text-[12px] font-[500] transition-all duration-150 cursor-pointer appearance-none ${
                                isGeminiSelected
                                  ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]"
                                  : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-2)]"
                              }`}
                              title="Gemini CLI model"
                            >
                              {isGeminiSelected ? (
                                <option value={selected}>{geminiLabel}</option>
                              ) : (
                                <option value="">Gemini</option>
                              )}
                              {geminiModels
                                .filter((m) => !isGeminiSelected || m.id !== selected)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.label}
                                  </option>
                                ))}
                            </select>
                            <Brain
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                              style={{
                                color: isGeminiSelected ? "var(--primary)" : "var(--text-3)",
                              }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
            {!ollamaAvailable && (
              <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-1)]">
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-4)]">
                  <Server className="w-3 h-3" />
                  Start Ollama (<code className="font-mono">ollama serve</code>) to use local models
                </div>
              </div>
            )}
            {!geminiAvailable && (
              <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-1)]">
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-4)]">
                  <Brain className="w-3 h-3" />
                  Install Gemini CLI (<code className="font-mono">npm i -g @google/gemini-cli</code>) for Google Search-grounded research
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Parent Project Sync Section */}
      <section className="mb-8">
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-[600] text-[var(--text-1)]">Project Nesting</h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              Behavior for projects that have children
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-[13px] font-[600] text-[var(--text-1)]">
                  Auto-sync parent syntheses
                </div>
                <div className="text-[12px] text-[var(--text-3)] mt-0.5 max-w-[480px]">
                  When a child project&apos;s synthesis completes, automatically
                  re-run the parent&apos;s synthesis. Coalesced to avoid bursts.
                  Default off — you can still run it on demand from a parent
                  project&apos;s wiki.
                </div>
              </div>
              <button
                onClick={toggleAutoSyncParent}
                disabled={autoSyncSaving}
                role="switch"
                aria-checked={autoSyncParent}
                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-60 ${
                  autoSyncParent
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--bg-2)] border border-[var(--border)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    autoSyncParent ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Theme Section */}
      <section className="mb-8">
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-[600] text-[var(--text-1)]">Theme</h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              Choose how WikiLM looks to you
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="flex gap-3">
              {themeOptions.map((option) => {
                const isSelected = theme === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-[13px] font-[500] transition-all duration-150 ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-2)]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Backup Section */}
      <section className="mb-8">
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-[600] text-[var(--text-1)]">Backup</h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              Snapshot the SQLite database and wiki content whenever you want. Keeps the latest 14 of each.
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-[13px] text-[var(--text-2)]">
                  Last backup:{" "}
                  <span className="font-[550] text-[var(--text-1)]">
                    {formatRelative(backupStatus?.lastBackupAt ?? null)}
                  </span>
                </div>
                {backupStatus?.location && (
                  <div className="text-[12px] text-[var(--text-4)] mt-1 font-mono break-all">
                    {backupStatus.location}
                  </div>
                )}
                {backupStatus?.lastDbFile && backupStatus?.lastContentFile && (
                  <div className="text-[11px] text-[var(--text-4)] mt-1 font-mono">
                    {backupStatus.lastDbFile} · {backupStatus.lastContentFile}
                  </div>
                )}
              </div>
              <button
                onClick={runBackup}
                disabled={backupRunning}
                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[var(--primary)] text-white text-[13px] font-[550] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {backupRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Backing up…
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    Backup now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section>
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-[600] text-[var(--text-1)]">About</h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              Application information
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text-3)]">Application</span>
              <span className="text-[13px] font-[500] text-[var(--text-1)]">WikiLM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text-3)]">Version</span>
              <span className="text-[13px] font-mono font-[500] text-[var(--text-1)]">0.1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text-3)]">Architecture</span>
              <span className="text-[13px] font-[500] text-[var(--text-1)]">LLM Wiki Schema</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text-3)]">Framework</span>
              <span className="text-[13px] font-mono font-[500] text-[var(--text-1)]">Next.js 16</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
