import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { api } from "../../../convex/_generated/api";
import { StatCard, FullPageLoader } from "../../components/ui";
import { useCurrency } from "../../lib/useCurrency";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
} from "lucide-react";

type Period = "mes" | "3m" | "6m" | "12m" | "todo";

const PERIODS: { key: Period; label: string; months: number }[] = [
  { key: "mes", label: "Este mes", months: 1 },
  { key: "3m", label: "3 meses", months: 3 },
  { key: "6m", label: "6 meses", months: 6 },
  { key: "12m", label: "12 meses", months: 12 },
  { key: "todo", label: "Todo", months: 12 },
];

function periodFrom(period: Period): number | undefined {
  if (period === "todo") return undefined;
  const now = new Date();
  const cfg = PERIODS.find((p) => p.key === period)!;
  return new Date(now.getFullYear(), now.getMonth() - (cfg.months - 1), 1).getTime();
}

export default function Finances() {
  const [period, setPeriod] = useState<Period>("6m");
  const { money, moneyShort } = useCurrency();

  const from = useMemo(() => periodFrom(period), [period]);
  const summary = useQuery(api.finances.summary, { from });
  const months = PERIODS.find((p) => p.key === period)!.months;
  const series = useQuery(api.finances.monthlySeries, { months });

  if (summary === undefined || series === undefined)
    return <FullPageLoader label="Cargando finanzas…" />;

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              period === p.key
                ? "bg-ink-900 text-white"
                : "bg-white text-ink-600 border border-ink-200 hover:border-ink-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos"
          value={money(summary.ingresos)}
          hint="Ventas + ingresos"
          icon={ArrowUpRight}
          accent="emerald"
        />
        <StatCard
          label="Egresos"
          value={money(summary.egresos)}
          hint="Compras + gastos"
          icon={ArrowDownRight}
          accent="red"
        />
        <StatCard
          label="Balance de caja"
          value={money(summary.balanceCaja)}
          hint="Ingresos − egresos"
          icon={Wallet}
          accent={summary.balanceCaja >= 0 ? "brand" : "red"}
        />
        <StatCard
          label="Ganancia neta"
          value={money(summary.gananciaNeta)}
          hint="Margen − gastos"
          icon={TrendingUp}
          accent="violet"
        />
      </div>

      {/* Gráfico */}
      <div className="card p-5">
        <h3 className="mb-4 font-semibold text-ink-900">Ingresos, egresos y ganancia por mes</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => moneyShort(Number(v))}
                width={54}
              />
              <Tooltip
                formatter={(value, name) => [money(Number(value)), name]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  boxShadow: "0 10px 30px -12px rgb(2 6 23 / 0.25)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={38} />
              <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={38} />
              <Line
                type="monotone"
                dataKey="ganancia"
                name="Ganancia"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#6366f1" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Desglose */}
      <div className="card p-5">
        <h3 className="mb-4 font-semibold text-ink-900">Desglose del período</h3>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
          <BreakdownRow label="Ventas" value={money(summary.ventasTotal)} sub={`${summary.cantidadVentas} operaciones`} />
          <BreakdownRow label="Costo de la mercadería vendida" value={`− ${money(summary.costoDeVentas)}`} negative />
          <BreakdownRow label="Ganancia bruta" value={money(summary.gananciaBruta)} bold />
          <BreakdownRow label="Ingresos extra" value={money(summary.ingresosExtra)} />
          <BreakdownRow label="Gastos" value={`− ${money(summary.gastosTotal)}`} negative />
          <BreakdownRow label="Compras (reposición)" value={money(summary.comprasTotal)} sub="Inversión en stock" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="font-semibold text-ink-900">Ganancia neta</span>
          <span
            className={`text-xl font-bold ${
              summary.gananciaNeta >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {money(summary.gananciaNeta)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  sub,
  bold,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-50 py-2.5">
      <div>
        <p className={`text-sm ${bold ? "font-semibold text-ink-900" : "text-ink-600"}`}>{label}</p>
        {sub && <p className="text-xs text-ink-400">{sub}</p>}
      </div>
      <span
        className={`text-sm font-semibold ${
          negative ? "text-red-600" : bold ? "text-ink-900" : "text-ink-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
