import { useState, FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Modal, Field } from "./ui";
import {
  CATEGORIES,
  CONDITIONS,
  STATUSES,
  BATTERY_TYPES,
  Category,
  Condition,
  ProductStatus,
  BatteryType,
} from "../lib/categories";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  product?: Doc<"products"> | null;
};

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

export default function ProductFormModal({ open, onClose, product }: Props) {
  const create = useMutation(api.products.create);
  const update = useMutation(api.products.update);
  const isEdit = !!product;

  const [form, setForm] = useState(() => ({
    name: product?.name ?? "",
    category: (product?.category ?? "iphone") as Category,
    condition: (product?.condition ?? "nuevo") as Condition,
    brand: product?.brand ?? "",
    model: product?.model ?? "",
    storage: product?.storage ?? "",
    color: product?.color ?? "",
    batteryHealth: product?.batteryHealth?.toString() ?? "",
    batteryType: (product?.batteryType ?? "") as "" | BatteryType,
    imei: product?.imei ?? "",
    costPrice: product?.costPrice?.toString() ?? "",
    salePrice: product?.salePrice?.toString() ?? "",
    quantity: product?.quantity?.toString() ?? "1",
    minStock: product?.minStock?.toString() ?? "",
    status: (product?.status ?? "disponible") as ProductStatus,
    featured: product?.featured ?? false,
    imageUrl: product?.imageUrl ?? "",
    description: product?.description ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isPhoneLike = form.category === "iphone";
  const cost = Number(form.costPrice) || 0;
  const price = Number(form.salePrice) || 0;
  const margin = price - cost;
  const marginPct = cost > 0 ? (margin / cost) * 100 : 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    if (form.costPrice === "" || form.salePrice === "")
      return setError("Ingresá el costo y el precio de venta.");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        condition: form.condition,
        brand: form.brand.trim() || undefined,
        model: form.model.trim() || undefined,
        storage: form.storage.trim() || undefined,
        color: form.color.trim() || undefined,
        batteryHealth: num(form.batteryHealth),
        batteryType: form.batteryType || undefined,
        imei: form.imei.trim() || undefined,
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        quantity: Number(form.quantity) || 0,
        minStock: num(form.minStock),
        status: form.status,
        featured: form.featured,
        imageUrl: form.imageUrl.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      if (isEdit && product) {
        await update({ id: product._id, ...payload });
      } else {
        await create(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Editar producto" : "Nuevo producto"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear producto"}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre / Título" className="sm:col-span-2">
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="iPhone 15 Pro Max"
            />
          </Field>

          <Field label="Categoría">
            <select
              className="input"
              value={form.category}
              onChange={(e) => set("category", e.target.value as Category)}
            >
              {(Object.keys(CATEGORIES) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c].label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Condición">
            <select
              className="input"
              value={form.condition}
              onChange={(e) => set("condition", e.target.value as Condition)}
            >
              {(Object.keys(CONDITIONS) as Condition[]).map((c) => (
                <option key={c} value={c}>
                  {CONDITIONS[c].label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Marca">
            <input
              className="input"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Apple"
            />
          </Field>
          <Field label="Modelo">
            <input
              className="input"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder="iPhone 15 Pro Max"
            />
          </Field>

          {isPhoneLike && (
            <>
              <Field label="Almacenamiento">
                <input
                  className="input"
                  value={form.storage}
                  onChange={(e) => set("storage", e.target.value)}
                  placeholder="256GB"
                />
              </Field>
              <Field label="Color">
                <input
                  className="input"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  placeholder="Titanio Natural"
                />
              </Field>
              <Field label="Salud de batería (%)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={form.batteryHealth}
                  onChange={(e) => set("batteryHealth", e.target.value)}
                  placeholder="100"
                />
              </Field>
              <Field label="Tipo de batería">
                <select
                  className="input"
                  value={form.batteryType}
                  onChange={(e) => set("batteryType", e.target.value as "" | BatteryType)}
                >
                  <option value="">Sin especificar</option>
                  {(Object.keys(BATTERY_TYPES) as BatteryType[]).map((b) => (
                    <option key={b} value={b}>
                      {b === "original" ? "Original" : "Reacondicionada"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="IMEI / Serie" className="sm:col-span-2">
                <input
                  className="input"
                  value={form.imei}
                  onChange={(e) => set("imei", e.target.value)}
                  placeholder="Opcional"
                />
              </Field>
            </>
          )}
          {!isPhoneLike && (
            <Field label="Color / Variante">
              <input
                className="input"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                placeholder="Opcional"
              />
            </Field>
          )}
        </div>

        {/* Precios */}
        <div className="rounded-2xl bg-ink-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Costo (compra)">
              <input
                className="input"
                type="number"
                value={form.costPrice}
                onChange={(e) => set("costPrice", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Precio de venta">
              <input
                className="input"
                type="number"
                value={form.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Ganancia unitaria">
              <div
                className={`input flex items-center font-semibold ${
                  margin >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {margin.toLocaleString("es-AR")}{" "}
                {cost > 0 && (
                  <span className="ml-1 text-xs font-normal text-ink-400">
                    ({marginPct.toFixed(0)}%)
                  </span>
                )}
              </div>
            </Field>
          </div>
        </div>

        {/* Stock y estado */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Cantidad en stock">
            <input
              className="input"
              type="number"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Alerta de stock mínimo" hint="Por defecto: 2">
            <input
              className="input"
              type="number"
              value={form.minStock}
              onChange={(e) => set("minStock", e.target.value)}
              placeholder="2"
            />
          </Field>
          <Field label="Estado">
            <select
              className="input"
              value={form.status}
              onChange={(e) => set("status", e.target.value as ProductStatus)}
            >
              {(Object.keys(STATUSES) as ProductStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUSES[s].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="URL de imagen" hint="Opcional. Se muestra en la tienda.">
          <input
            className="input"
            value={form.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Detalles que verá el cliente en la tienda…"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            checked={form.featured}
            onChange={(e) => set("featured", e.target.checked)}
          />
          <span className="text-sm text-ink-700">Destacar en la tienda (aparece primero)</span>
        </label>
      </form>
    </Modal>
  );
}
