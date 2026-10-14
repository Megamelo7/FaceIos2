import { CalendarDays } from "lucide-react";
import { Period, PERIODS } from "../lib/periods";

/**
 * Selector de período segmentado (Finanzas, Movimientos): se distingue de los
 * chips de filtro y en pantallas angostas se desplaza de costado.
 */
export default function PeriodTabs({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Período"
      className="flex w-full max-w-full items-center overflow-x-auto rounded-xl border border-ink-200 bg-ink-100 p-1 sm:inline-flex sm:w-auto sm:gap-0.5 sm:self-start"
    >
      <CalendarDays className="ml-1.5 mr-1 hidden h-4 w-4 shrink-0 text-ink-400 sm:block" aria-hidden="true" />
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          role="tab"
          aria-selected={value === p.key}
          onClick={() => onChange(p.key)}
          className={`flex-1 shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium transition-colors sm:flex-none sm:px-3 ${
            value === p.key
              ? "bg-surface font-semibold text-ink-900 shadow-sm ring-1 ring-ink-200"
              : "text-ink-500 hover:text-ink-800"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
