"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutGrid,
  FileText,
  Download,
  MessageSquare,
  Clock,
  Share2,
  Beaker,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ProjectSwitcher } from "@/components/project-switcher";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutGrid;
  badgeKey?: "sourceCount" | "runningJobs";
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Wiki", href: "/wiki", icon: FileText },
  { label: "Sources", href: "/sources", icon: Download, badgeKey: "sourceCount" },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Jobs", href: "/jobs", icon: Clock, badgeKey: "runningJobs" },
  { label: "Graph", href: "/graph", icon: Share2 },
  { label: "Lint", href: "/lint", icon: Beaker },
];

const settingsItem = { label: "Settings", href: "/settings", icon: Settings };

interface SidebarData {
  sourceCount: number;
  runningJobs: number;
  activeJob: { title: string; progress: string | null } | null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [data, setData] = useState<SidebarData>({
    sourceCount: 0,
    runningJobs: 0,
    activeJob: null,
  });

  const fetchSidebarData = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/job");
      if (res.ok) {
        const json = await res.json();
        const running = json.jobs?.filter(
          (j: { status: string }) => j.status === "running"
        );
        setData({
          sourceCount: 0, // Will be populated by sources API
          runningJobs: running?.length ?? 0,
          activeJob: running?.[0]
            ? { title: running[0].title, progress: running[0].progress }
            : null,
        });
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchSidebarData();
    const interval = setInterval(fetchSidebarData, 3000);
    return () => clearInterval(interval);
  }, [fetchSidebarData]);

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <aside className="w-60 flex flex-col shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--bg-1)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-[var(--border)]">
        <div className="w-6 h-6 rounded-md bg-[var(--primary)] flex items-center justify-center">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            className="w-3.5 h-3.5"
          >
            <circle cx="8" cy="8" r="3.5" />
            <path d="M8 1v3M8 12v3M1 8h3M12 8h3" />
          </svg>
        </div>
        <span className="text-sm font-[650] tracking-tight text-[var(--text-1)]">
          WikiLM
        </span>
      </div>

      {/* Project Switcher */}
      <ProjectSwitcher />

      {/* Navigation */}
      <nav className="flex flex-col gap-px px-2 pt-2 flex-1 overflow-y-auto">
        <div className="text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider px-2.5 pt-3 pb-1.5">
          Navigate
        </div>
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const badgeValue = item.badgeKey ? data[item.badgeKey] : 0;
          const isRunning = item.badgeKey === "runningJobs" && badgeValue > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-100 ${
                isActive
                  ? "bg-[var(--bg-active)] text-[var(--text-1)] font-[550]"
                  : "text-[var(--text-3)] font-[450] hover:bg-[var(--bg-hover)] hover:text-[var(--text-2)]"
              }`}
            >
              <item.icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "opacity-85" : "opacity-55"
                }`}
              />
              {item.label}
              {item.badgeKey && badgeValue > 0 && (
                <span
                  className={`ml-auto text-[10px] font-semibold font-mono px-1.5 py-px rounded-full ${
                    isRunning
                      ? "bg-[var(--green-dim)] text-[var(--green)] animate-pulse"
                      : "bg-[var(--primary-dim)] text-[var(--primary)]"
                  }`}
                >
                  {badgeValue}
                </span>
              )}
            </Link>
          );
        })}

        <div className="h-px bg-[var(--border)] my-1.5 mx-0.5" />

        <Link
          href={settingsItem.href}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-100 ${
            pathname.startsWith(settingsItem.href)
              ? "bg-[var(--bg-active)] text-[var(--text-1)] font-[550]"
              : "text-[var(--text-3)] font-[450] hover:bg-[var(--bg-hover)] hover:text-[var(--text-2)]"
          }`}
        >
          <settingsItem.icon
            className={`w-4 h-4 shrink-0 ${
              pathname.startsWith(settingsItem.href)
                ? "opacity-85"
                : "opacity-55"
            }`}
          />
          {settingsItem.label}
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--border)]">
        {/* Active Job Indicator */}
        {data.activeJob && (
          <div className="flex items-center gap-2 px-2.5 py-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-md mb-1.5">
            <div className="w-3 h-3 border-[1.5px] border-[var(--border-strong)] border-t-[var(--primary)] rounded-full animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-[var(--text-2)] truncate">
                {data.activeJob.title}
              </div>
              {data.activeJob.progress && (
                <div className="text-[10px] text-[var(--text-3)] font-mono">
                  {(() => {
                    try {
                      const p = JSON.parse(data.activeJob.progress);
                      return `${p.current} / ${p.total}`;
                    } catch {
                      return "";
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-[450] text-[var(--text-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-2)] w-full text-left transition-all duration-100"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 shrink-0 opacity-55" />
          ) : (
            <Moon className="w-4 h-4 shrink-0 opacity-55" />
          )}
          {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
