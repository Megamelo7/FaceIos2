import { currencySymbol } from "./currencies";

export function formatCurrency(value: number, currency = "ARS"): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  } catch {
    // Monedas sin código ISO (p. ej. USDT): símbolo + número.
    return `${currencySymbol(currency)} ${Math.round(value ?? 0).toLocaleString("es-AR")}`;
  }
}

/** Versión compacta: $1,2M / US$980k */
export function formatCurrencyShort(value: number, currency = "ARS"): string {
  const abs = Math.abs(value);
  const symbol = currencySymbol(currency);
  const sep = /[A-Za-z]$/.test(symbol) ? " " : "";
  if (abs >= 1_000_000)
    return `${symbol}${sep}${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${symbol}${sep}${Math.round(value / 1_000)}k`;
  return `${symbol}${sep}${Math.round(value)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value ?? 0);
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Convierte un timestamp a valor para <input type="date"> (YYYY-MM-DD). */
export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(ts - offset).toISOString().slice(0, 10);
}

/** Convierte un valor de <input type="date"> a timestamp (mediodía local). */
export function fromDateInputValue(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}
