"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    custom: (toast: Omit<Toast, "id">) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastMethods = {
    success: (title: string, message?: string, duration?: number) =>
      addToast("success", title, message, duration),
    error: (title: string, message?: string, duration?: number) =>
      addToast("error", title, message, duration),
    info: (title: string, message?: string, duration?: number) =>
      addToast("info", title, message, duration),
    warning: (title: string, message?: string, duration?: number) =>
      addToast("warning", title, message, duration),
    custom: (t: Omit<Toast, "id">) => addToast(t.type, t.title, t.message, t.duration),
  };

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          container: "bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
          progress: "bg-emerald-500",
        };
      case "error":
        return {
          container: "bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/50",
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
          progress: "bg-rose-500",
        };
      case "warning":
        return {
          container: "bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/50",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
          progress: "bg-amber-500",
        };
      case "info":
      default:
        return {
          container: "bg-slate-900/90 border-indigo-500/40 text-slate-100 shadow-indigo-950/50",
          icon: <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />,
          progress: "bg-indigo-500",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((item) => {
          const style = getToastStyle(item.type);
          return (
            <div
              key={item.id}
              className={`pointer-events-auto relative overflow-hidden backdrop-blur-md border rounded-xl p-4 shadow-xl flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${style.container}`}
            >
              {style.icon}
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold tracking-tight leading-snug">{item.title}</p>
                {item.message && (
                  <p className="text-xs opacity-80 mt-1 leading-relaxed break-words">
                    {item.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="opacity-60 hover:opacity-100 transition-opacity p-1 -mr-1 -mt-1 rounded-md text-inherit"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
