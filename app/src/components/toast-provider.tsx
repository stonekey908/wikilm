"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; color: string; bg: string }
> = {
  success: { icon: CheckCircle2, color: "var(--green)", bg: "var(--green-dim)" },
  error: { icon: XCircle, color: "var(--red)", bg: "var(--red-dim)" },
  info: { icon: Info, color: "var(--blue)", bg: "var(--blue-dim)" },
  warning: { icon: AlertTriangle, color: "var(--orange)", bg: "var(--orange-dim)" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...toast, id }]);
      // Auto-dismiss after 5 seconds
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const config = typeConfig[toast.type];
          const Icon = config.icon;
          return (
            <div
              key={toast.id}
              className="flex items-start gap-3 px-4 py-3 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] animate-in slide-in-from-right-5 duration-200"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: config.bg }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-[550] text-[var(--text-1)]">
                  {toast.title}
                </div>
                {toast.description && (
                  <div className="text-[12px] text-[var(--text-3)] mt-0.5">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
