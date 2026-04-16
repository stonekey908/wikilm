"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Monitor, Zap, Cpu, Brain, Check } from "lucide-react";

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
  { key: "chat", label: "Chat", desc: "Conversational queries against your wiki" },
  { key: "query", label: "Query", desc: "Direct wiki lookups" },
  { key: "lint", label: "Lint", desc: "Wiki health checks and cleanup" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [modelSettings, setModelSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const models: Record<string, string> = {};
        for (const op of operations) {
          models[op.key] = data[`model_${op.key}`] ?? "sonnet";
        }
        setModelSettings(models);
      })
      .catch(() => {});
  }, []);

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
              Choose which Claude model to use for each operation
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {operations.map((op) => (
              <div key={op.key} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[13px] font-[600] text-[var(--text-1)]">{op.label}</div>
                    <div className="text-[12px] text-[var(--text-3)] mt-0.5">{op.desc}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {models.map((m) => {
                      const isSelected = (modelSettings[op.key] ?? "sonnet") === m.value;
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.value}
                          onClick={() => setModel(op.key, m.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12px] font-[500] transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]"
                              : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-2)]"
                          }`}
                          title={m.desc}
                        >
                          <Icon className="w-3 h-3" />
                          {m.label}
                          {isSelected && saving === op.key && (
                            <Check className="w-3 h-3 text-[var(--green)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Theme Section */}
      <section className="mb-8">
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-sm)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-[600] text-[var(--text-1)]">Theme</h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              Choose how SecondBrain looks to you
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
              <span className="text-[13px] font-[500] text-[var(--text-1)]">SecondBrain</span>
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
