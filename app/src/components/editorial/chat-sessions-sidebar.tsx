"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/components/project-switcher";

interface ChatSession {
  id: number;
  projectId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function ChatSessionsSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject } = useProject();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const projectId = activeProject?.id ?? null;
  const activeSessionId = Number(searchParams.get("session"));

  const fetchSessions = useCallback(async () => {
    if (projectId === null) return;
    try {
      const res = await fetch(`/api/chat/sessions?projectId=${projectId}`);
      if (res.ok) {
        const d = await res.json();
        setSessions(d.sessions ?? []);
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const onEvt = () => fetchSessions();
    window.addEventListener("editorial:chat-sessions-refresh", onEvt);
    return () => window.removeEventListener("editorial:chat-sessions-refresh", onEvt);
  }, [fetchSessions]);

  async function newChat() {
    router.push("/chat");
  }

  async function openSession(id: number) {
    router.push(`/chat?session=${id}`);
  }

  async function removeSession(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
      setSessions((p) => p.filter((s) => s.id !== id));
      if (activeSessionId === id) router.push("/chat");
    } catch {}
  }

  return (
    <div>
      <button type="button" className="chat-sessions-new" onClick={newChat}>
        <span>+</span>
        <span>New chat</span>
      </button>
      <div className="chat-sessions">
        {sessions.slice(0, 10).map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chat-session-row${s.id === activeSessionId ? " active" : ""}`}
            onClick={() => openSession(s.id)}
          >
            <span className="ico">❞</span>
            <span className="t">{s.title}</span>
            <span
              className="del"
              role="button"
              onClick={(e) => removeSession(e, s.id)}
              title="Delete"
            >
              ×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
