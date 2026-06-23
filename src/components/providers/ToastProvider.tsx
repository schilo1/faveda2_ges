"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastInput = {
  type: ToastType;
  title: unknown;
  description?: unknown;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  success: (title: unknown, description?: unknown) => void;
  error: (title: unknown, description?: unknown) => void;
  info: (title: unknown, description?: unknown) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const tone = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    iconClassName: "text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-900",
    iconClassName: "text-red-600",
  },
  info: {
    icon: Info,
    className: "border-[#D9D7D2] bg-white text-gray-800",
    iconClassName: "text-[#596744]",
  },
};

function readableMessage(value: unknown, fallback = "Action impossible."): string {
  if (typeof value === "string") return value;
  if (!value) return fallback;
  if (value instanceof Error) return value.message || fallback;

  if (typeof value === "object") {
    const error = value as {
      formErrors?: unknown[];
      fieldErrors?: Record<string, unknown[]>;
      message?: unknown;
      error?: unknown;
    };

    if (typeof error.message === "string") return error.message;
    if (typeof error.error === "string") return error.error;

    const messages = [
      ...(Array.isArray(error.formErrors) ? error.formErrors : []),
      ...Object.values(error.fieldErrors ?? {}).flat(),
    ].filter((item): item is string => typeof item === "string" && item.trim().length > 0);

    if (messages.length > 0) return messages.join(" ");
  }

  return fallback;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(current => [...current.slice(-3), {
      id,
      type: input.type,
      title: readableMessage(input.title, "Notification"),
      description: input.description ? readableMessage(input.description) : undefined,
    }]);
    window.setTimeout(() => remove(id), 4500);
  }, [remove]);

  const value = useMemo<ToastContextValue>(() => ({
    toast,
    success: (title, description) => toast({ type: "success", title, description }),
    error: (title, description) => toast({ type: "error", title, description }),
    info: (title, description) => toast({ type: "info", title, description }),
  }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-3">
        {toasts.map(item => {
          const styles = tone[item.type];
          const Icon = styles.icon;
          return (
            <div
              key={item.id}
              role="status"
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-black/10 backdrop-blur ${styles.className}`}
            >
              <Icon size={19} className={`mt-0.5 shrink-0 ${styles.iconClassName}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{item.title}</p>
                {item.description && <p className="mt-0.5 text-sm opacity-80">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
                aria-label="Fermer la notification"
              >
                <X size={15} />
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
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
