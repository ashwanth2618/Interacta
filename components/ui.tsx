"use client";

import { createContext, useCallback, useContext, useState, useRef, useEffect } from "react";

/* ------------------------------ Toaster ------------------------------ */

type ToastKind = "success" | "error" | "info";
interface Toast { id: number; kind: ToastKind; message: string }

const ToastCtx = createContext<(kind: ToastKind, message: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const TOAST_STYLE: Record<ToastKind, string> = {
  success: "bg-emerald-600",
  error: "bg-rose-600",
  info: "bg-ink-800",
};
const TOAST_ICON: Record<ToastKind, string> = { success: "✓", error: "!", info: "i" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)]" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${TOAST_STYLE[t.kind]} text-white rounded-xl shadow-lift px-4 py-3 text-sm font-medium flex items-start gap-2.5 animate-fade-up`}>
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{TOAST_ICON[t.kind]}</span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------ Modal ------------------------------ */

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} bg-white rounded-t-2xl sm:rounded-2xl shadow-lift max-h-[92vh] flex flex-col animate-fade-up`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} className="btn-ghost !px-2 !py-1.5 text-lg leading-none" aria-label="Close dialog">×</button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------ misc ------------------------------ */

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function EmptyState({ icon = "🗂️", title, body, action }: {
  icon?: string; title: string; body?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="text-4xl mb-3" aria-hidden>{icon}</div>
      <p className="font-bold text-ink-800">{title}</p>
      {body && <p className="text-sm text-ink-500 mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="text-4xl mb-3" aria-hidden>⚠️</div>
      <p className="font-bold text-ink-800">Something went wrong</p>
      <p className="text-sm text-ink-500 mt-1 max-w-sm">{message}</p>
      {onRetry && <button className="btn-secondary mt-4" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4">
          <div className="skeleton h-4 w-1/3 mb-2.5" />
          <div className="skeleton h-3 w-2/3 mb-1.5" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function Avatar({ name, color, size = 36 }: { name: string; color?: string | null; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color ?? "#4f46e5", fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
