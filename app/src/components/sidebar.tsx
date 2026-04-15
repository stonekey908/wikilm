"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FileText,
  Download,
  MessageSquare,
  Clock,
  Share2,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ProjectSwitcher } from "@/components/project-switcher";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Wiki", href: "/wiki", icon: FileText },
  { label: "Sources", href: "/sources", icon: Download },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Jobs", href: "/jobs", icon: Clock },
  { label: "Graph", href: "/graph", icon: Share2 },
];

const settingsItem = { label: "Settings", href: "/settings", icon: Settings };

export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

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
          SecondBrain
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
