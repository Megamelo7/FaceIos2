import { useState, FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { FullPageLoader, Field, Modal, Badge, EmptyState } from "../../components/ui";
import { useCurrency } from "../../lib/useCurrency";
import { formatDate } from "../../lib/format";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Contact,
  Phone,
  Mail,
  ShoppingBag,
  Eye,
} from "lucide-react";

type Customer = Doc<"customers">;

/** Clientes: datos básicos + historial de compras. */
export default function Customers() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [detailId, setDetailId] = useState<Id<"customers"> | null>(null);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const customers = useQuery(api.customers.list, { search: search || undefined });
  const remove = useMutation(api.customers.remove);
  const { money } = useCurrency();

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await remove({ id: toDelete._id });
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre, teléfono o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="btn-primary shrink-0"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo cliente
        </button>
      </div>

      {customers === undefined ? (
        <FullPageLoader label="Cargando clientes…" />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Contact}
          title={search ? "Sin resultados" : "Todavía no hay clientes"}
          description={
            search
              ? "Probá con otro nombre, teléfono o email."
              : "Se crean desde acá o directamente al registrar una venta."
          }
          action={
            !search && (
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Nuevo cliente
              </button>
            )
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Contacto</th>
                  <th className="px-4 py-3 text-center font-semibold">Compras</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Última compra</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-600">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{c.name}</p>
                          {c.notes && <p className="truncate text-xs text-ink-400">{c.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {c.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-ink-400" /> {c.phone}
                        </p>
                      )}
                      {c.email && (
                        <p className="flex items-center gap-1.5 text-xs text-ink-500">
                          <Mail className="h-3.5 w-3.5 text-ink-400" /> {c.email}
                        </p>
                      )}
                      {!c.phone && !c.email && <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={c.count > 0 ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-500"}>
                        <ShoppingBag className="h-3 w-3" /> {c.count}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink-900">
                      {c.count > 0 ? money(c.total) : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-500">{c.last ? formatDate(c.last) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                          onClick={() => setDetailId(c._id)}
                          title="Ver historial"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-600"
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setToDelete(c)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink-100 px-4 py-2.5 text-xs text-ink-400">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {formOpen && (
        <CustomerFormModal
          key={editing?._id ?? "new"}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          customer={editing}
        />
      )}

      {detailId && <CustomerDetailModal id={detailId} onClose={() => setDetailId(null)} />}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        size="sm"
        title="Eliminar cliente"
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
          ¿Eliminar a <strong className="text-ink-900">{toDelete?.name}</strong>? Sus ventas se
          conservan en el historial (con el nombre), pero dejan de estar vinculadas.
        </p>
      </Modal>
    </div>
  );
}

/* ───────────────────────── Alta / edición ───────────────────────── */

function CustomerFormModal({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
}) {
  const create = useMutation(api.customers.create);
  const update = useMutation(api.customers.update);
  const isEdit = !!customer;

  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit && customer) {
        await update({ id: customer._id, name, phone, email, notes });
      } else {
        await create({ name, phone, email, notes });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "No se pudo guardar.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar cliente" : "Nuevo cliente"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear cliente"}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
        )}
        <Field label="Nombre y apellido">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono" hint="Ideal con código de país, ej. 54911…">
            <input
              className="input"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5491112345678"
            />
          </Field>
          <Field label="Email (opcional)">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
            />
          </Field>
        </div>
        <Field label="Notas (opcional)">
          <textarea
            className="input min-h-[70px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferencias, zona de entrega, etc."
          />
        </Field>
      </form>
    </Modal>
  );
}

/* ───────────────────────── Detalle + historial ───────────────────────── */

function CustomerDetailModal({ id, onClose }: { id: Id<"customers">; onClose: () => void }) {
  const data = useQuery(api.customers.get, { id });
  const { money } = useCurrency();

  return (
    <Modal open onClose={onClose} title="Historial del cliente">
      {data === undefined ? (
        <FullPageLoader label="Cargando…" />
      ) : data === null ? (
        <p className="text-sm text-ink-500">El cliente ya no existe.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-100 text-lg font-bold text-ink-600">
              {data.customer.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-ink-900">{data.customer.name}</p>
              {data.customer.phone && (
                <p className="flex items-center gap-1.5 text-sm text-ink-600">
                  <Phone className="h-3.5 w-3.5 text-ink-400" /> {data.customer.phone}
                </p>
              )}
              {data.customer.email && (
                <p className="flex items-center gap-1.5 text-sm text-ink-600">
                  <Mail className="h-3.5 w-3.5 text-ink-400" /> {data.customer.email}
                </p>
              )}
              {data.customer.notes && (
                <p className="mt-1 text-xs text-ink-500">{data.customer.notes}</p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink-800">
                Compras ({data.sales.length})
              </h4>
              <span className="text-sm font-semibold text-ink-900">
                {money(data.sales.reduce((s, t) => s + t.amount, 0))}
              </span>
            </div>
            {data.sales.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
                Todavía no tiene compras registradas.
              </p>
            ) : (
              <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                {data.sales.map((t) => (
                  <div key={t._id} className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {t.productName ?? "Venta"}
                        {t.quantity ? <span className="text-ink-400"> ×{t.quantity}</span> : ""}
                      </p>
                      <p className="text-xs text-ink-400">
                        {formatDate(t.date)}
                        {t.paymentMethod ? ` · ${t.paymentMethod}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{money(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
