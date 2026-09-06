import { ReactNode, useEffect } from "react";
import { X, LucideIcon } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  );
}

export function FullPageLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-ink-500">
      <Spinner className="h-7 w-7 text-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`badge ${className}`}>{children}</span>;
}

export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === "lg" ? "max-w-3xl" : size === "sm" ? "max-w-sm" : "max-w-xl";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full ${width} max-h-[92vh] overflow-hidden rounded-t-3xl bg-white shadow-card-lg animate-fade-in sm:rounded-2xl`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h3 className="text-base font-semibold text-ink-900">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[calc(92vh-8rem)] overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/50 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "brand",
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: ReactNode;
  accent?: "brand" | "emerald" | "amber" | "red" | "ink" | "violet";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    ink: "bg-ink-100 text-ink-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
