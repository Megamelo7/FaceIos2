import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

/** "2026-12-01" → "01/12/2026". */
const toText = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

/** Formato dd/mm/aaaa mientras se escribe: sólo dígitos, las barras se ponen solas. */
function mask(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "01/12/2026" → "2026-12-01"; null si está incompleta o no existe (p. ej. 31/02). */
function toIso(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const exists =
    d.getFullYear() === Number(yyyy) &&
    d.getMonth() === Number(mm) - 1 &&
    d.getDate() === Number(dd);
  return exists ? `${yyyy}-${mm}-${dd}` : null;
}

type Props = {
  /** YYYY-MM-DD (como el <input type="date">) o "" si no hay fecha válida. */
  value: string;
  onChange: (value: string) => void;
  /** Fecha mínima del calendario (YYYY-MM-DD). */
  min?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * Campo de fecha siempre en formato dd/mm/aaaa: el <input type="date"> nativo
 * usa el formato del navegador, que puede ser mm/dd y confunde. El valor sigue
 * siendo YYYY-MM-DD, y el botón abre el calendario nativo.
 */
export default function DateInput({ value, onChange, min, autoFocus, onKeyDown }: Props) {
  const [text, setText] = useState(() => toText(value));
  const [focused, setFocused] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  // Si la fecha cambia desde afuera (calendario, otro campo), mostrarla.
  useEffect(() => {
    if (value !== (toIso(text) ?? "")) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function onType(raw: string) {
    const next = mask(raw);
    setText(next);
    onChange(toIso(next) ?? "");
  }

  function openCalendar() {
    const el = picker.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  }

  // En rojo si la fecha no existe, o si quedó incompleta al salir del campo.
  const invalid = text !== "" && toIso(text) === null && (text.length === 10 || !focused);

  return (
    <div className="relative">
      <input
        className={`input pr-10 ${
          invalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""
        }`}
        value={text}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        placeholder="dd/mm/aaaa"
        inputMode="numeric"
        maxLength={10}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        title={invalid ? "Fecha inválida: usá dd/mm/aaaa" : undefined}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Elegir en el calendario"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
        onClick={openCalendar}
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      {/* Calendario nativo, invisible: sólo se usa su selector. */}
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
