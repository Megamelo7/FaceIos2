import { useState, FormEvent, KeyboardEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { FullPageLoader, Field, Modal, Badge, EmptyState } from "../../components/ui";
import {
  CATEGORIES,
  CATALOG_CATEGORIES,
  CatalogCategory,
} from "../../lib/categories";
import { Plus, Pencil, Trash2, Loader2, Layers, X, Sparkles } from "lucide-react";

type Model = Doc<"deviceModels">;

/** Menú de configuración: modelos, colores y capacidades por categoría. */
export default function Catalog() {
  const [active, setActive] = useState<CatalogCategory>("iphone");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const [toDelete, setToDelete] = useState<Model | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const all = useQuery(api.catalog.list, {});
  const remove = useMutation(api.catalog.remove);
  const seed = useMutation(api.catalog.seed);

  const models = (all ?? []).filter((m) => m.category === active);

  async function runSeed() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const msg = await seed({});
      setSeedMsg(msg);
    } finally {
      setSeeding(false);
    }
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500">
          Definí los modelos con sus colores y capacidades. Al crear un artículo, se eligen desde
          combos. Accesorios y otros se cargan a mano.
        </p>
        <div className="flex shrink-0 gap-2">
          {all && all.length === 0 && (
            <button className="btn-secondary" onClick={runSeed} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Cargar catálogo Apple
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo modelo
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">{seedMsg}</div>
      )}

      {/* Tabs por categoría */}
      <div className="flex flex-wrap gap-2">
        {CATALOG_CATEGORIES.map((c) => {
          const meta = CATEGORIES[c];
          const count = (all ?? []).filter((m) => m.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active === c
                  ? "bg-ink-900 text-white"
                  : "bg-white text-ink-600 border border-ink-200 hover:border-ink-300"
              }`}
            >
              <meta.icon className="h-3.5 w-3.5" />
              {meta.plural}
              <span className={`ml-0.5 text-xs ${active === c ? "text-ink-300" : "text-ink-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {all === undefined ? (
        <FullPageLoader label="Cargando modelos…" />
      ) : models.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={`Sin modelos de ${CATEGORIES[active].label}`}
          description={
            all.length === 0
              ? "Cargá el catálogo oficial de Apple con un clic o agregá modelos a mano."
              : "Agregá un modelo para esta categoría."
          }
          action={
            all.length === 0 ? (
              <button className="btn-primary" onClick={runSeed} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Cargar catálogo Apple
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Nuevo modelo
              </button>
            )
          }
        />
      ) : (
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {models.map((m) => (
            <div key={m._id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{m.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.colors.map((c) => (
                    <Badge key={c} className="bg-ink-100 text-ink-700">
                      {c}
                    </Badge>
                  ))}
                  {m.colors.length === 0 && (
                    <span className="text-xs text-ink-400">Sin colores</span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {m.storages.map((s) => (
                    <Badge key={s} className="bg-brand-50 text-brand-700">
                      {s}
                    </Badge>
                  ))}
                  {m.storages.length === 0 && (
                    <span className="text-xs text-ink-400">Sin capacidades (no aplica)</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-600"
                  onClick={() => {
                    setEditing(m);
                    setFormOpen(true);
                  }}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setToDelete(m)}
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ModelFormModal
          key={editing?._id ?? "new"}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          model={editing}
          defaultCategory={active}
        />
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        size="sm"
        title="Eliminar modelo"
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
          ¿Eliminar <strong className="text-ink-900">{toDelete?.name}</strong> del catálogo? Los
          artículos ya creados no se modifican.
        </p>
      </Modal>
    </div>
  );
}

/* ───────────────────────── Formulario de modelo ───────────────────────── */

function ModelFormModal({
  open,
  onClose,
  model,
  defaultCategory,
}: {
  open: boolean;
  onClose: () => void;
  model: Model | null;
  defaultCategory: CatalogCategory;
}) {
  const create = useMutation(api.catalog.create);
  const update = useMutation(api.catalog.update);
  const isEdit = !!model;

  const [category, setCategory] = useState<CatalogCategory>(model?.category ?? defaultCategory);
  const [name, setName] = useState(model?.name ?? "");
  const [colors, setColors] = useState<string[]>(model?.colors ?? []);
  const [storages, setStorages] = useState<string[]>(model?.storages ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit && model) {
        await update({ id: model._id, category, name, colors, storages });
      } else {
        await create({ category, name, colors, storages });
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
      title={isEdit ? "Editar modelo" : "Nuevo modelo"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear modelo"}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
        )}
        <Field label="Categoría">
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as CatalogCategory)}
          >
            {CATALOG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nombre del modelo">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='iPhone 16 Pro Max · iPad Air 11" (M3, 2025)'
          />
        </Field>
        <Field label="Colores" hint="Escribí y apretá Enter (o coma) para agregar cada color.">
          <ChipInput value={colors} onChange={setColors} placeholder="Titanio natural, Negro…" />
        </Field>
        <Field
          label="Capacidades"
          hint="Enter o coma para agregar. Dejá vacío si no aplica (ej. AirPods)."
        >
          <ChipInput value={storages} onChange={setStorages} placeholder="128GB, 256GB, 512GB…" />
        </Field>
      </form>
    </Modal>
  );
}

/* ───────────────────────── Input de chips ───────────────────────── */

function ChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) onChange(Array.from(new Set([...value, ...parts])));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="input flex min-h-[44px] flex-wrap items-center gap-1.5 py-1.5">
      {value.map((v) => (
        <span key={v} className="badge bg-ink-100 text-ink-700">
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== v))}
            className="ml-0.5 text-ink-400 hover:text-red-600"
            aria-label={`Quitar ${v}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        className="min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:ring-0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ""}
      />
    </div>
  );
}
