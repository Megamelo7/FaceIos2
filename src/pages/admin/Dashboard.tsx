import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { StatCard, FullPageLoader, Badge } from "../../components/ui";
import { useCurrency } from "../../lib/useCurrency";
import { formatDateTime, formatNumber } from "../../lib/format";
import { CATEGORIES, TX_META, Category, TxType } from "../../lib/categories";
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
} from "lucide-react";

export default function Dashboard() {
  const data = useQuery(api.dashboard.overview);
  const { money } = useCurrency();

  if (data === undefined) return <FullPageLoader label="Cargando panel…" />;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas del mes"
          value={money(data.ventasMesTotal)}
          hint={`${data.ventasMesCantidad} ${data.ventasMesCantidad === 1 ? "venta" : "ventas"}`}
          icon={ShoppingCart}
          accent="brand"
        />
        <StatCard
          label="Ganancia del mes"
          value={money(data.gananciaMes)}
          hint="Ingresos − costos − gastos"
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="Unidades en stock"
          value={formatNumber(data.unidadesEnStock)}
          hint={`${data.totalProductos} productos`}
          icon={Boxes}
          accent="violet"
        />
        <StatCard
          label="Valor inventario"
          value={money(data.valorInventarioVenta)}
          hint={`Costo: ${money(data.valorInventarioCosto)}`}
          icon={Package}
          accent="ink"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Balance del mes */}
        <div className="card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-ink-900">Balance del mes</h3>
            <Wallet className="h-5 w-5 text-ink-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-ink-600">
                <ArrowUpRight className="h-4 w-4 text-emerald-500" /> Ingresos
              </span>
              <span className="font-semibold text-ink-900">{money(data.ingresosMes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-ink-600">
                <ArrowDownRight className="h-4 w-4 text-red-500" /> Egresos
              </span>
              <span className="font-semibold text-ink-900">{money(data.egresosMes)}</span>
            </div>
            <div className="mt-2 border-t border-ink-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">Balance de caja</span>
                <span
                  className={`text-lg font-bold ${
                    data.balanceCajaMes >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {money(data.balanceCajaMes)}
                </span>
              </div>
            </div>
          </div>

          {/* Distribución por categoría */}
          <div className="mt-5 border-t border-ink-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Productos por categoría
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
                const count = data.porCategoria[cat] ?? 0;
                const meta = CATEGORIES[cat];
                if (count === 0) return null;
                return (
                  <Badge key={cat} className={meta.color}>
                    <meta.icon className="h-3.5 w-3.5" />
                    {meta.plural}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stock bajo */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas de stock bajo
            </h3>
            <Link to="/admin/stock" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Ver stock
            </Link>
          </div>
          {data.stockBajo.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">
              Todo el stock está en niveles saludables. 👍
            </p>
          ) : (
            <div className="space-y-2">
              {data.stockBajo.slice(0, 6).map((p) => {
                const meta = CATEGORIES[p.category as Category] ?? CATEGORIES.otro;
                return (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-xl border border-ink-100 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.color}`}>
                        <meta.icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-ink-800">{p.name}</span>
                    </div>
                    <Badge
                      className={
                        p.quantity === 0
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }
                    >
                      {p.quantity === 0 ? "Sin stock" : `${p.quantity} u.`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h3 className="font-semibold text-ink-900">Actividad reciente</h3>
          <Link to="/admin/movimientos" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Ver todo
          </Link>
        </div>
        {data.recientes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            Todavía no hay movimientos registrados.
          </p>
        ) : (
          <div className="divide-y divide-ink-100">
            {data.recientes.map((t) => {
              const meta = TX_META[t.type as TxType];
              return (
                <div key={t._id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Badge className={meta.color}>{meta.label}</Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-800">
                        {t.productName ?? "—"}
                        {t.quantity ? ` ×${t.quantity}` : ""}
                      </p>
                      <p className="text-xs text-ink-400">{formatDateTime(t.date)}</p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      meta.sign > 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {meta.sign > 0 ? "+" : "−"}
                    {money(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
