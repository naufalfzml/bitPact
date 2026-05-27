"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ToastTone = "success" | "info" | "warning" | "destructive";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  push: (tone: ToastTone, message: string, ttl?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TTL_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextId, setNextId] = useState(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string, ttl: number = DEFAULT_TTL_MS) => {
      setNextId((id) => {
        const newId = id;
        const toast: Toast = { id: newId, tone, message };
        setToasts((current) => [...current, toast]);
        if (ttl > 0) {
          window.setTimeout(() => dismiss(newId), ttl);
        }
        return id + 1;
      });
    },
    [dismiss]
  );

  const ctx = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="bp-toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`bp-toast bp-toast-${t.tone}`}
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
          >
            <span className="bp-toast-mark">■</span>
            <span className="bp-toast-message">{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastApi {
  success: (msg: string, ttl?: number) => void;
  info: (msg: string, ttl?: number) => void;
  warning: (msg: string, ttl?: number) => void;
  error: (msg: string, ttl?: number) => void;
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used within a <ToastProvider>");
  }
  return useMemo<ToastApi>(
    () => ({
      success: (msg, ttl) => ctx.push("success", msg, ttl),
      info: (msg, ttl) => ctx.push("info", msg, ttl),
      warning: (msg, ttl) => ctx.push("warning", msg, ttl),
      error: (msg, ttl) => ctx.push("destructive", msg, ttl),
    }),
    [ctx]
  );
}

// Re-export for type imports in pages that want narrow types
export { ToastContext };
