/** Períodos para filtrar por fecha (Finanzas, Movimientos). */
export type Period = "mes" | "3m" | "6m" | "12m" | "todo";

export const PERIODS: { key: Period; label: string; months: number }[] = [
  { key: "mes", label: "Este mes", months: 1 },
  { key: "3m", label: "3 meses", months: 3 },
  { key: "6m", label: "6 meses", months: 6 },
  { key: "12m", label: "12 meses", months: 12 },
  { key: "todo", label: "Todo", months: 12 },
];

/** Inicio del período (1° del mes, contando el actual); `undefined` = sin límite. */
export function periodFrom(period: Period): number | undefined {
  if (period === "todo") return undefined;
  const now = new Date();
  const cfg = PERIODS.find((p) => p.key === period)!;
  return new Date(now.getFullYear(), now.getMonth() - (cfg.months - 1), 1).getTime();
}
