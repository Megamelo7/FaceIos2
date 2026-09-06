import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Search, UserPlus, Check } from "lucide-react";

/** Selección de cliente al registrar una venta. */
export type CustomerSelection =
  | { kind: "existing"; id: Id<"customers">; label: string }
  | { kind: "new"; data: { name: string; phone: string; email: string } }
  | null;

type Props = {
  value: CustomerSelection;
  onChange: (v: CustomerSelection) => void;
};

/**
 * Buscar un cliente existente (por nombre, teléfono o email) o crear uno
 * nuevo en el momento con los datos básicos.
 */
export default function CustomerPicker({ value, onChange }: Props) {
  const [q, setQ] = useState("");
  const results = useQuery(api.customers.search, value === null ? { q } : "skip") ?? [];

  if (value?.kind === "existing") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <Check className="h-4 w-4" />
          {value.label}
        </span>
        <button
          type="button"
          className="text-xs font-semibold text-emerald-700 hover:underline"
          onClick={() => onChange(null)}
        >
          Cambiar
        </button>
      </div>
    );
  }

  if (value?.kind === "new") {
    const d = value.data;
    const set = (k: keyof typeof d, v: string) =>
      onChange({ kind: "new", data: { ...d, [k]: v } });
    return (
      <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <UserPlus className="h-3.5 w-3.5" /> Cliente nuevo
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-brand-700 hover:underline"
            onClick={() => onChange(null)}
          >
            Elegir existente
          </button>
        </div>
        <input
          className="input"
          placeholder="Nombre y apellido *"
          value={d.name}
          onChange={(e) => set("name", e.target.value)}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Teléfono"
            inputMode="tel"
            value={d.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <input
            className="input"
            placeholder="Email (opcional)"
            type="email"
            value={d.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, teléfono o email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-ink-200 bg-white">
        {results.map((c) => (
          <button
            type="button"
            key={c._id}
            onClick={() =>
              onChange({
                kind: "existing",
                id: c._id,
                label: [c.name, c.phone].filter(Boolean).join(" · "),
              })
            }
            className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm hover:bg-ink-50"
          >
            <span className="font-medium text-ink-900">{c.name}</span>
            <span className="text-xs text-ink-400">{c.phone ?? c.email ?? ""}</span>
          </button>
        ))}
        {results.length === 0 && (
          <p className="px-3.5 py-2 text-xs text-ink-400">
            {q ? "Sin resultados." : "Todavía no hay clientes cargados."}
          </p>
        )}
        <button
          type="button"
          onClick={() => onChange({ kind: "new", data: { name: q.trim(), phone: "", email: "" } })}
          className="flex w-full items-center gap-2 border-t border-ink-100 px-3.5 py-2 text-left text-sm font-semibold text-brand-600 hover:bg-brand-50"
        >
          <UserPlus className="h-4 w-4" />
          Crear cliente nuevo{q.trim() ? ` "${q.trim()}"` : ""}
        </button>
      </div>
      <p className="text-xs text-ink-400">Opcional: también podés registrar la venta sin cliente.</p>
    </div>
  );
}
