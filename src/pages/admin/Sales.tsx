import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FullPageLoader, Badge, EmptyState, Modal } from "../../components/ui";
import TransactionModal from "../../components/TransactionModal";
import { useCurrency } from "../../lib/useCurrency";
import { formatDate } from "../../lib/format";
import { TX_META, TxType } from "../../lib/categories";
import {
  Plus,
  ShoppingCart,
  PackagePlus,
  TrendingDown,
  TrendingUp,
  Trash2,
  Receipt,
  Loader2,
} from "lucide-react";

export default function Sales() {
  const [filter, setFilter] = useState<TxType | "all">("all");
  const [modalType, setModalType] = useState<TxType | null>(null);
  const [toDelete, setToDelete] = useState<Id<"transactions"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const txs = useQuery(api.transactions.list, {
    type: filter === "all" ? undefined : filter,
    limit: 200,
  });
  const remove = useMutation(api.transactions.remove);
  const { money } = useCurrency();

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await remove({ id: toDelete });
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Acciones */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button className="btn-primary" onClick={() => setModalType("venta")}>
          <ShoppingCart className="h-4 w-4" /> Venta
        </button>
        <button className="btn-secondary" onClick={() => setModalType("compra")}>
          <PackagePlus className="h-4 w-4" /> Compra
        </button>
        <button className="btn-secondary" onClick={() => setModalType("ingreso")}>
          <TrendingUp className="h-4 w-4" /> Ingreso
        </button>
        <button className="btn-secondary" onClick={() => setModalType("gasto")}>
          <TrendingDown className="h-4 w-4" /> Gasto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Todas
        </FilterChip>
        {(Object.keys(TX_META) as TxType[]).map((t) => (
          <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>
            {TX_META[t].label}
          </FilterChip>
        ))}
      </div>

      {/* Tabla */}
      {txs === undefined ? (
        <FullPageLoader label="Cargando transacciones…" />
      ) : txs.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin movimientos"
          description="Registrá tu primera venta, compra, ingreso o gasto."
          action={
            <button className="btn-primary" onClick={() => setModalType("venta")}>
              <Plus className="h-4 w-4" /> Registrar venta
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Detalle</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-right font-semibold">Monto</th>
                  <th className="px-4 py-3 text-right font-semibold">Ganancia</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {txs.map((t) => {
                  const meta = TX_META[t.type];
                  return (
                    <tr key={t._id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <Badge className={meta.color}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-900">
                          {t.productName ?? "—"}
                          {t.quantity ? <span className="text-ink-400"> ×{t.quantity}</span> : ""}
                        </p>
                        {t.customerName && (
                          <p className="text-xs text-ink-400">Cliente: {t.customerName}</p>
                        )}
                        {t.notes && !t.customerName && (
                          <p className="truncate text-xs text-ink-400">{t.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-500">{t.paymentMethod ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-500">{formatDate(t.date)}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          meta.sign > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {meta.sign > 0 ? "+" : "−"}
                        {money(t.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-500">
                        {t.type === "venta" && t.profit !== undefined ? (
                          <span className={t.profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                            {money(t.profit)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setToDelete(t._id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink-100 px-4 py-2.5 text-xs text-ink-400">
            {txs.length} movimiento{txs.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {modalType && (
        <TransactionModal
          open={!!modalType}
          type={modalType}
          onClose={() => setModalType(null)}
        />
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        size="sm"
        title="Eliminar movimiento"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setToDelete(null)}>
              Cancelar
            </button>
            <button className="btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          ¿Eliminar este movimiento? Si es una venta o compra, el stock del producto se ajusta
          automáticamente.
        </p>
      </Modal>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-ink-900 text-white"
          : "bg-white text-ink-600 border border-ink-200 hover:border-ink-300"
      }`}
    >
      {children}
    </button>
  );
}
