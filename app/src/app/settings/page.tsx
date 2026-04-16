"use client";

import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Monitor } from "lucide-react";

const themeOptions = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

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
