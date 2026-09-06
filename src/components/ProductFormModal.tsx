import { useState, FormEvent } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Modal, Field } from "./ui";
import ImageUploader, { ImageItem } from "./ImageUploader";
import {
  CATEGORIES,
  CONDITIONS,
  STATUSES,
  BATTERY_TYPES,
  CATEGORY_ORDER,
  isCatalogCategory,
  Category,
  Condition,
  ProductStatus,
  BatteryType,
  PAYMENT_METHODS,
} from "../lib/categories";
import { toDateInputValue, fromDateInputValue, formatDateTime } from "../lib/format";
import { Loader2, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

/** Producto tal como lo devuelve `api.products.list` (con URLs de fotos resueltas). */
export type ProductWithImages = Doc<"products"> & { imageUrls: string[] };

/** Resultado guardado de la consulta de IMEI en ENACOM. */
type ImeiCheck = NonNullable<Doc<"products">["imeiCheck"]>;

type Props = {
  open: boolean;
  onClose: () => void;
  product?: ProductWithImages | null;
  /** "purchase": alta desde Movimientos → Compra (pide medio de pago y fecha). */
  mode?: "purchase";
};

const CUSTOM = "__custom__";
const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

/** Categorías de equipos con almacenamiento, batería e IMEI/serie. */
const DEVICE_CATS: Category[] = ["iphone", "ipad", "notebook"];

export default function ProductFormModal({ open, onClose, product, mode }: Props) {
  const create = useMutation(api.products.create);
  const update = useMutation(api.products.update);
  const catalog = useQuery(api.catalog.list, {}) ?? [];
  const checkImei = useAction(api.enacom.checkImei);
  const isEdit = !!product;
  const isPurchase = mode === "purchase" && !isEdit;

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
    imeiCheck: (product?.imeiCheck ?? null) as ImeiCheck | null,
    costPrice: product?.costPrice?.toString() ?? "",
    salePrice: product?.salePrice?.toString() ?? "",
    quantity: product?.quantity?.toString() ?? "1",
    minStock: product?.minStock?.toString() ?? "",
    status: (product?.status ?? "disponible") as ProductStatus,
    featured: product?.featured ?? false,
    images: (product?.images ?? []).map((id, i) => ({
      id,
      url: product?.imageUrls[i] ?? "",
    })) as ImageItem[],
    description: product?.description ?? "",
  }));
  // "Otro / escribir a mano" elegido explícitamente en cada combo.
  const [forceCustom, setForceCustom] = useState({ model: false, color: false, storage: false });
  // Datos de la compra (sólo en modo compra).
  const [payment, setPayment] = useState("Efectivo");
  const [purchaseDate, setPurchaseDate] = useState(toDateInputValue(Date.now()));
  // Consulta de IMEI en ENACOM.
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /* ───────── Combos desde el catálogo de modelos ───────── */
  const isCatalog = isCatalogCategory(form.category);
  const models = catalog.filter((m) => m.category === form.category);
  const selectedModel = models.find((m) => m.name === form.model);
  const colorOptions = selectedModel?.colors ?? [];
  const storageOptions = selectedModel?.storages ?? [];

  const showModelSelect =
    isCatalog && !forceCustom.model && (form.model === "" || !!selectedModel);
  const showColorSelect =
    !!selectedModel &&
    colorOptions.length > 0 &&
    !forceCustom.color &&
    (form.color === "" || colorOptions.includes(form.color));
  const showStorageSelect =
    !!selectedModel &&
    storageOptions.length > 0 &&
    !forceCustom.storage &&
    (form.storage === "" || storageOptions.includes(form.storage));

  const isDevice = DEVICE_CATS.includes(form.category);
  // Almacenamiento: equipos siempre; AirPods sólo si el modelo lo define.
  const showStorageField = isDevice || (isCatalog && storageOptions.length > 0);
  const serialLabel = form.category === "notebook" ? "Número de serie" : "IMEI / Serie";
  // ENACOM sólo verifica IMEI (iPhone / iPad); las notebooks usan número de serie.
  const canCheckImei = form.category !== "notebook";
  const imeiDigits = form.imei.replace(/\D/g, "");

  async function checkImeiNow() {
    setCheckError(null);
    setChecking(true);
    try {
      const r = await checkImei({ imei: form.imei });
      set("imeiCheck", {
        status: r.status,
        title: r.title,
        message: r.message,
        gsma: r.gsma,
        checkedAt: r.checkedAt,
      });
    } catch (err) {
      setCheckError(err instanceof ConvexError ? String(err.data) : "No se pudo consultar ENACOM.");
    } finally {
      setChecking(false);
    }
  }

  function onChangeCategory(category: Category) {
    setForm((f) => ({ ...f, category, model: "", color: "", storage: "" }));
    setForceCustom({ model: false, color: false, storage: false });
  }

  function onSelectModel(value: string) {
    if (value === CUSTOM) {
      setForceCustom((c) => ({ ...c, model: true }));
      setForm((f) => ({ ...f, model: "", color: "", storage: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      model: value,
      // Autocompletar nombre y marca si aún no los cargó el usuario.
      name: f.name.trim() === "" || f.name === f.model ? value : f.name,
      brand: f.brand.trim() === "" ? "Apple" : f.brand,
      color: "",
      storage: "",
    }));
    setForceCustom({ model: false, color: false, storage: false });
  }

  function onSelectColor(value: string) {
    if (value === CUSTOM) {
      setForceCustom((c) => ({ ...c, color: true }));
      set("color", "");
      return;
    }
    set("color", value);
  }

  function onSelectStorage(value: string) {
    if (value === CUSTOM) {
      setForceCustom((c) => ({ ...c, storage: true }));
      set("storage", "");
      return;
    }
    set("storage", value);
  }

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
        imeiCheck: form.imeiCheck ?? undefined,
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        minStock: num(form.minStock),
        status: form.status,
        featured: form.featured,
        images: form.images.map((i) => i.id),
        description: form.description.trim() || undefined,
      };
      if (isEdit && product) {
        // El stock no se edita acá: sólo cambia desde Movimientos.
        await update({ id: product._id, ...payload });
      } else {
        await create({
          ...payload,
          quantity: Number(form.quantity) || 0,
          ...(isPurchase
            ? { paymentMethod: payment, purchaseDate: fromDateInputValue(purchaseDate) }
            : {}),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      setSaving(false);
    }
  }

  const backToList = (field: "model" | "color" | "storage") => (
    <button
      type="button"
      className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700"
      onClick={() => {
        setForceCustom((c) => ({ ...c, [field]: false }));
        set(field, "");
      }}
    >
      ← Elegir de la lista
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Editar producto" : isPurchase ? "Compra: producto nuevo" : "Nuevo producto"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : isPurchase ? "Registrar compra" : "Crear producto"}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            <select
              className="input"
              value={form.category}
              onChange={(e) => onChangeCategory(e.target.value as Category)}
            >
              {CATEGORY_ORDER.map((c) => (
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

          {/* Modelo: combo desde el catálogo o texto libre */}
          <Field
            label="Modelo"
            className={isCatalog ? "sm:col-span-2" : ""}
            hint={
              isCatalog && models.length === 0
                ? "No hay modelos cargados para esta categoría. Cargalos en Modelos o escribí a mano."
                : undefined
            }
          >
            {showModelSelect ? (
              <select
                className="input"
                value={form.model}
                onChange={(e) => onSelectModel(e.target.value)}
              >
                <option value="">— Elegí un modelo —</option>
                {models.map((m) => (
                  <option key={m._id} value={m.name}>
                    {m.name}
                  </option>
                ))}
                <option value={CUSTOM}>Otro (escribir a mano)…</option>
              </select>
            ) : (
              <>
                <input
                  className="input"
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                  placeholder={isCatalog ? "Escribí el modelo" : "Ej: Cargador 20W"}
                />
                {isCatalog && models.length > 0 && backToList("model")}
              </>
            )}
          </Field>

          <Field label="Nombre / Título" className="sm:col-span-2">
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Se completa con el modelo; podés ajustarlo"
            />
          </Field>

          <Field label="Marca">
            <input
              className="input"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Apple"
            />
          </Field>

          {/* Color: combo del modelo o texto libre */}
          <Field label={isCatalog ? "Color" : "Color / Variante"}>
            {showColorSelect ? (
              <select
                className="input"
                value={form.color}
                onChange={(e) => onSelectColor(e.target.value)}
              >
                <option value="">— Elegí un color —</option>
                {colorOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={CUSTOM}>Otro (escribir a mano)…</option>
              </select>
            ) : isCatalog && !forceCustom.model && !selectedModel && form.model === "" ? (
              <select className="input" disabled value="">
                <option value="">Primero elegí el modelo</option>
              </select>
            ) : (
              <>
                <input
                  className="input"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  placeholder="Opcional"
                />
                {!!selectedModel && colorOptions.length > 0 && backToList("color")}
              </>
            )}
          </Field>

          {/* Almacenamiento: combo del modelo o texto libre */}
          {showStorageField && (
            <Field label="Almacenamiento">
              {showStorageSelect ? (
                <select
                  className="input"
                  value={form.storage}
                  onChange={(e) => onSelectStorage(e.target.value)}
                >
                  <option value="">— Elegí la capacidad —</option>
                  {storageOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value={CUSTOM}>Otra (escribir a mano)…</option>
                </select>
              ) : isCatalog && !forceCustom.model && !selectedModel && form.model === "" ? (
                <select className="input" disabled value="">
                  <option value="">Primero elegí el modelo</option>
                </select>
              ) : (
                <>
                  <input
                    className="input"
                    value={form.storage}
                    onChange={(e) => set("storage", e.target.value)}
                    placeholder="256GB"
                  />
                  {!!selectedModel && storageOptions.length > 0 && backToList("storage")}
                </>
              )}
            </Field>
          )}

          {isDevice && (
            <>
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
              <Field label={serialLabel} className="sm:col-span-2">
                <div className="flex gap-2">
                  <input
                    className="input"
                    value={form.imei}
                    onChange={(e) => {
                      set("imei", e.target.value);
                      // Cambió el número: la consulta anterior ya no aplica.
                      set("imeiCheck", null);
                      setCheckError(null);
                    }}
                    placeholder={canCheckImei ? "15 dígitos · marcá *#06# en el equipo" : "Opcional"}
                    inputMode="numeric"
                  />
                  {canCheckImei && (
                    <button
                      type="button"
                      className="btn-secondary shrink-0"
                      onClick={checkImeiNow}
                      disabled={checking || imeiDigits.length < 14}
                      title="Consulta oficial en imei.enacom.gob.ar"
                    >
                      {checking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Consultar ENACOM
                    </button>
                  )}
                </div>
                {checkError && <p className="mt-1.5 text-xs text-red-600">{checkError}</p>}
                {form.imeiCheck && (
                  <div
                    className={`mt-2 rounded-xl px-3.5 py-2.5 text-sm ${
                      form.imeiCheck.status === "bloqueado"
                        ? "bg-red-50 text-red-800"
                        : form.imeiCheck.status === "valido"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    <p className="flex items-center gap-1.5 font-semibold">
                      {form.imeiCheck.status === "bloqueado" ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : form.imeiCheck.status === "valido" ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <ShieldQuestion className="h-4 w-4" />
                      )}
                      {form.imeiCheck.title}
                    </p>
                    <p className="mt-0.5 text-xs opacity-90">
                      {form.imeiCheck.message}
                      {form.imeiCheck.gsma ? ` · ${form.imeiCheck.gsma}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] opacity-70">
                      Fuente: ENACOM · {formatDateTime(form.imeiCheck.checkedAt)} ·{" "}
                      <a
                        href="https://imei.enacom.gob.ar/"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        ver en ENACOM
                      </a>
                    </p>
                  </div>
                )}
              </Field>
            </>
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
          {isEdit ? (
            <Field label="Stock actual" hint="Se ajusta desde Movimientos: Compra suma, Venta resta.">
              <div className="input flex items-center bg-ink-50 font-semibold text-ink-700">
                {product?.quantity ?? 0} u.
              </div>
            </Field>
          ) : (
            <Field
              label={isPurchase ? "Cantidad comprada" : "Stock inicial"}
              hint="Queda registrado como una Compra en Movimientos."
            >
              <input
                className="input"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                placeholder="0"
              />
            </Field>
          )}
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

        {/* Datos de la compra (sólo desde Movimientos → Compra) */}
        {isPurchase && (
          <div className="rounded-2xl bg-orange-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-700">
              Datos de la compra
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Medio de pago">
                <select
                  className="input"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de compra">
                <input
                  className="input"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Fotos */}
        <Field
          label="Fotos del producto"
          hint="La primera foto es la principal y se muestra en la tienda. Podés subir varias."
        >
          <ImageUploader value={form.images} onChange={(items) => set("images", items)} />
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
