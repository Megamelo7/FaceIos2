import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { FullPageLoader, Badge, EmptyState, Modal } from "../../components/ui";
import ProductFormModal from "../../components/ProductFormModal";
import { useCurrency } from "../../lib/useCurrency";
import {
  CATEGORIES,
  CONDITIONS,
  STATUSES,
  CATEGORY_ORDER,
  Category,
} from "../../lib/categories";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Star,
  Loader2,
} from "lucide-react";

export default function Products() {
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"products"> | null>(null);
  const [toDelete, setToDelete] = useState<Doc<"products"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const products = useQuery(api.products.list, {
    category: category === "all" ? undefined : category,
    search: search || undefined,
  });
  const remove = useMutation(api.products.remove);
  const { money } = useCurrency();

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: Doc<"products">) {
    setEditing(p);
    setFormOpen(true);
  }
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
      {/* Barra de acciones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre, modelo, IMEI…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary shrink-0" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      {/* Filtros por categoría */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
          Todos
        </FilterChip>
        {CATEGORY_ORDER.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
            <CATEGORIES[c].icon className="h-3.5 w-3.5" />
            {CATEGORIES[c].plural}
          </FilterChip>
        ))}
      </div>

      {/* Tabla */}
      {products === undefined ? (
        <FullPageLoader label="Cargando productos…" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos"
          description="Agregá tu primer iPhone o accesorio para empezar a controlar el stock."
          action={
            <button className="btn-primary" onClick={openNew}>
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-semibold">Producto</th>
                  <th className="px-4 py-3 font-semibold">Categoría</th>
                  <th className="px-4 py-3 font-semibold">Condición</th>
                  <th className="px-4 py-3 text-center font-semibold">Stock</th>
                  <th className="px-4 py-3 text-right font-semibold">Costo</th>
                  <th className="px-4 py-3 text-right font-semibold">Precio</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {products.map((p) => {
                  const meta = CATEGORIES[p.category];
                  const min = p.minStock ?? 2;
                  const low = p.quantity <= min;
                  const subtitle = [p.storage, p.color, p.model !== p.name ? p.model : null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <tr key={p._id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                            <meta.icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium text-ink-900">
                              {p.name}
                              {p.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                            </p>
                            {subtitle && <p className="truncate text-xs text-ink-400">{subtitle}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={meta.color}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={CONDITIONS[p.condition].color}>
                          {CONDITIONS[p.condition].label}
                          {p.batteryHealth ? ` · ${p.batteryHealth}%` : ""}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-0.5 font-semibold ${
                            p.quantity === 0
                              ? "bg-red-50 text-red-600"
                              : low
                                ? "bg-amber-50 text-amber-600"
                                : "text-ink-700"
                          }`}
                        >
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-ink-500">{money(p.costPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink-900">
                        {money(p.salePrice)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUSES[p.status].color}>{STATUSES[p.status].label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-600"
                            onClick={() => openEdit(p)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setToDelete(p)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink-100 px-4 py-2.5 text-xs text-ink-400">
            {products.length} producto{products.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Modal alta/edición — key fuerza reinicio del form al cambiar */}
      {formOpen && (
        <ProductFormModal
          key={editing?._id ?? "new"}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          product={editing}
        />
      )}

      {/* Confirmación de borrado */}
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        size="sm"
        title="Eliminar producto"
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
          ¿Seguro que querés eliminar <strong className="text-ink-900">{toDelete?.name}</strong>?
          Esta acción no se puede deshacer. El historial de ventas se conserva.
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
