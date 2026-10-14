import { useState, FormEvent, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Modal, Field, ColorDot } from "./ui";
import CustomerPicker, { CustomerSelection } from "./CustomerPicker";
import DateInput from "./DateInput";
import { TX_META, TxType, PAYMENT_METHODS, CONDITIONS } from "../lib/categories";
import {
  toDateInputValue,
  fromDateInputValue,
  addDaysToDateInput,
  daysBetweenDateInputs,
  formatDate,
} from "../lib/format";
import { warrantyTypeFor } from "../lib/warranty";
import { useCurrency } from "../lib/useCurrency";
import FxFields, { useFx, InputCurrency } from "./FxFields";
import { Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  type: TxType;
  /** Producto preseleccionado (p. ej. "Ingresar stock" desde la tabla de Stock). */
  initialProductId?: Id<"products">;
  /** En Compra: permite cargar un producto NUEVO con todos los combos. */
  onCreateNewProduct?: () => void;
};

type Product = FunctionReturnType<typeof api.products.list>[number];

/** Un artículo de la venta/compra (en Compra hay uno solo). */
type Line = {
  key: number;
  productId: string;
  quantity: string;
  unitValue: string; // precio (venta) o costo (compra), en la moneda cargada
  // "Editar garantía" (usados): vencimiento cargado a mano; null = el de Ajustes.
  editedWarrantyEnd: string | null;
};

let nextLineKey = 1;
const newLine = (): Line => ({
  key: nextLineKey++,
  productId: "",
  quantity: "1",
  unitValue: "",
  editedWarrantyEnd: null,
});

/**
 * Garantía de un artículo vendido: nuevo → Apple (sin fechas: la calcula Apple
 * desde la activación); usado → de la tienda, desde la fecha de venta y por los
 * días de Ajustes (el backend la calcula igual al registrar), o hasta el
 * vencimiento que se cargue con "Editar garantía".
 */
function lineWarranty(
  product: Product | undefined,
  date: string,
  editedEnd: string | null,
  settingsDays: number | undefined,
) {
  const type = product ? warrantyTypeFor(product, date) : null;
  // Usado con garantía Apple vigente: vence en la fecha de su ficha.
  const appleEnd =
    type === "apple" && product?.condition !== "nuevo" ? product?.appleWarrantyEnd : undefined;
  // Usado con garantía Apple cargada pero ya vencida a la fecha de venta.
  const expiredAppleEnd = type === "tienda" ? product?.appleWarrantyEnd : undefined;
  const end =
    editedEnd ?? (date && settingsDays !== undefined ? addDaysToDateInput(date, settingsDays) : null);
  const days = date && end ? daysBetweenDateInputs(date, end) : null;
  return { type, appleEnd, expiredAppleEnd, end, days };
}

export default function TransactionModal({
  open,
  onClose,
  type,
  initialProductId,
  onCreateNewProduct,
}: Props) {
  const products = useQuery(api.products.list, open ? {} : "skip");
  const recordSales = useMutation(api.transactions.recordSales);
  const recordPurchase = useMutation(api.transactions.recordPurchase);
  const recordManual = useMutation(api.transactions.recordManual);
  const settings = useQuery(api.settings.getAdmin);
  const { money, moneyIn } = useCurrency();
  const fx = useFx();

  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState(""); // gasto/ingreso
  const [updateCost, setUpdateCost] = useState(false);
  const [payment, setPayment] = useState("Efectivo");
  const [customer, setCustomer] = useState<CustomerSelection>(null);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(toDateInputValue(Date.now()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isSale = type === "venta";
  const isPurchase = type === "compra";
  const isProductTx = isSale || isPurchase;
  const meta = TX_META[type];
  const settingsDays = settings?.warrantyDays;

  const productById = (id: string) => products?.find((p) => p._id === id);
  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  /** Unidades de un producto ya cargadas en los otros artículos de la venta. */
  const usedElsewhere = (productId: string, exceptKey?: number) =>
    lines
      .filter((l) => l.key !== exceptKey && l.productId === productId)
      .reduce((s, l) => s + (Number(l.quantity) || 0), 0);

  // VENTA: sólo artículos con stock (descontando lo cargado en otros artículos).
  // COMPRA (reposición): sólo artículos por cantidad; los equipos con IMEI
  // (iPhone / iPad) son únicos y entran como producto nuevo.
  const optionsFor = (line: Line) =>
    isSale
      ? products?.filter(
          (p) => p._id === line.productId || p.quantity - usedElsewhere(p._id, line.key) > 0,
        )
      : isPurchase
        ? products?.filter((p) => p.category !== "iphone" && p.category !== "ipad")
        : products;
  const noStock = isSale && products !== undefined && !products.some((p) => p.quantity > 0);
  const canAddLine =
    isSale && !!products?.some((p) => p.quantity - usedElsewhere(p._id) > 0);

  function onSelectProduct(key: number, id: string) {
    if (id === "__new__") {
      onCreateNewProduct?.();
      return;
    }
    const p = productById(id);
    updateLine(key, {
      productId: id,
      editedWarrantyEnd: null,
      ...(p ? { unitValue: fx.convertFromStore(isSale ? p.salePrice : p.costPrice) } : {}),
    });
  }

  function onFxCurrencyChange(to: InputCurrency) {
    setLines((ls) => ls.map((l) => ({ ...l, unitValue: fx.convertInput(l.unitValue, to) })));
    setAmount((v) => fx.convertInput(v, to));
  }

  // Preseleccionar el producto cuando la lista termina de cargar.
  useEffect(() => {
    const first = lines[0];
    if (initialProductId && products && first.productId === "") {
      const p = products.find((x) => x._id === initialProductId);
      if (p) {
        updateLine(first.key, {
          productId: p._id,
          unitValue: isSale ? p.salePrice.toString() : p.costPrice.toString(),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProductId, products]);

  // Importes en la moneda cargada; los "Store" siempre en la moneda de la tienda.
  const lineInput = (l: Line) => (Number(l.quantity) || 0) * (Number(l.unitValue) || 0);
  const lineStore = (l: Line) => (Number(l.quantity) || 0) * fx.toStore(Number(l.unitValue) || 0);
  const totalInput = isProductTx
    ? lines.reduce((s, l) => s + lineInput(l), 0)
    : Number(amount) || 0;
  const total = isProductTx ? lines.reduce((s, l) => s + lineStore(l), 0) : fx.toStore(totalInput);
  const sold = lines.filter((l) => productById(l.productId));
  const estimatedProfit = sold.reduce(
    (s, l) => s + lineStore(l) - productById(l.productId)!.costPrice * (Number(l.quantity) || 0),
    0,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (fx.error) return setError(fx.error);
    if (!date) return setError("Ingresá una fecha válida (dd/mm/aaaa).");
    setSaving(true);
    try {
      const when = fromDateInputValue(date);
      if (isSale) {
        if (lines.some((l) => !l.productId)) {
          throw new Error(
            lines.length > 1
              ? "Elegí el producto de cada artículo (o quitá el que sobra)."
              : "Elegí un producto.",
          );
        }
        if (customer?.kind === "new" && !customer.data.name.trim()) {
          throw new Error("Ingresá el nombre del cliente (o elegí uno existente).");
        }
        const items = lines.map((l) => {
          const product = productById(l.productId)!;
          const w = lineWarranty(product, date, l.editedWarrantyEnd, settingsDays);
          if (w.type === "tienda") {
            if (!w.end) {
              throw new Error(
                `${product.name}: configurá los días de garantía de usados en Ajustes o usá “Editar garantía”.`,
              );
            }
            if (w.end < date) {
              throw new Error(
                `${product.name}: el vencimiento de la garantía no puede ser anterior a la fecha de venta.`,
              );
            }
          }
          return {
            productId: product._id,
            quantity: Number(l.quantity),
            unitPrice: fx.toStore(Number(l.unitValue) || 0),
            fxAmount: fx.inArs ? lineInput(l) : undefined,
            warrantyEnd:
              w.type === "tienda" && l.editedWarrantyEnd
                ? fromDateInputValue(l.editedWarrantyEnd)
                : undefined,
          };
        });
        await recordSales({
          items,
          fxRate: fx.fxRate,
          paymentMethod: payment,
          customerId: customer?.kind === "existing" ? customer.id : undefined,
          newCustomer:
            customer?.kind === "new"
              ? {
                  name: customer.data.name,
                  phone: customer.data.phone || undefined,
                  email: customer.data.email || undefined,
                }
              : undefined,
          notes: notes.trim() || undefined,
          date: when,
        });
      } else if (isPurchase) {
        const line = lines[0];
        const product = productById(line.productId);
        if (!product) throw new Error("Elegí un producto.");
        await recordPurchase({
          productId: product._id,
          quantity: Number(line.quantity),
          unitCost: fx.toStore(Number(line.unitValue) || 0),
          fxRate: fx.fxRate,
          fxAmount: fx.inArs ? totalInput : undefined,
          updateCost,
          paymentMethod: payment,
          notes: notes.trim() || undefined,
          date: when,
        });
      } else {
        if (!concept.trim()) throw new Error("Ingresá un concepto.");
        await recordManual({
          type: type as "gasto" | "ingreso",
          amount: fx.toStore(Number(amount)),
          fxRate: fx.fxRate,
          fxAmount: fx.inArs ? totalInput : undefined,
          concept: concept.trim(),
          paymentMethod: payment,
          notes: notes.trim() || undefined,
          date: when,
        });
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof ConvexError
          ? String(err.data)
          : err instanceof Error
            ? err.message
            : "No se pudo registrar.",
      );
      setSaving(false);
    }
  }

  const titles: Record<TxType, string> = {
    venta: "Registrar venta",
    compra: "Registrar compra / reposición",
    gasto: "Registrar gasto",
    ingreso: "Registrar ingreso",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titles[type]}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <FxFields fx={fx} onCurrencyChange={onFxCurrencyChange} />

        {isProductTx ? (
          <>
            {lines.map((line, i) => (
              <ProductLine
                key={line.key}
                line={line}
                index={i}
                count={lines.length}
                product={productById(line.productId)}
                options={optionsFor(line)}
                isSale={isSale}
                hint={
                  i > 0
                    ? undefined
                    : isPurchase && onCreateNewProduct
                      ? "Reposición de accesorios/AirPods. Los iPhone/iPad entran siempre como “Producto nuevo” (cada equipo con IMEI es único)."
                      : noStock
                        ? "No hay artículos con stock. Registrá una Compra primero."
                        : undefined
                }
                allowNewProduct={isPurchase && !!onCreateNewProduct}
                inArs={fx.inArs}
                date={date}
                settingsDays={settingsDays}
                onSelectProduct={(id) => onSelectProduct(line.key, id)}
                onChange={(patch) => updateLine(line.key, patch)}
                onRemove={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
              />
            ))}
            {isSale && (
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => setLines((ls) => [...ls, newLine()])}
                disabled={!canAddLine}
              >
                <Plus className="h-4 w-4" /> Agregar otro artículo
              </button>
            )}
            {isPurchase && (
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  checked={updateCost}
                  onChange={(e) => setUpdateCost(e.target.checked)}
                />
                <span className="text-sm text-ink-700">
                  Actualizar el costo del producto con este valor
                </span>
              </label>
            )}
          </>
        ) : (
          <>
            <Field label="Concepto">
              <input
                className="input"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder={type === "gasto" ? "Alquiler, servicios, envío…" : "Reparación, seña…"}
              />
            </Field>
            <Field label={fx.inArs ? "Monto (ARS)" : "Monto"}>
              <input
                className="input"
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </Field>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
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
          <Field label="Fecha">
            <DateInput value={date} onChange={setDate} />
          </Field>
        </div>

        {isSale && (
          <Field label="Cliente">
            <CustomerPicker value={customer} onChange={setCustomer} />
          </Field>
        )}

        <Field label="Notas (opcional)">
          <input
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalle adicional…"
          />
        </Field>

        {/* Resumen */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${meta.color}`}>
          <span className="text-sm font-medium">
            Total {meta.label.toLowerCase()}
            {isSale && lines.length > 1 ? ` · ${lines.length} artículos` : ""}
          </span>
          <span className="text-right">
            <span className="block text-lg font-bold">{money(total)}</span>
            {fx.inArs && (
              <span className="block text-xs font-medium opacity-80">
                {moneyIn(totalInput, "ARS")}
              </span>
            )}
          </span>
        </div>
        {isSale && sold.length > 0 && (
          <p className="text-xs text-ink-500">
            Ganancia estimada:{" "}
            <strong className="text-emerald-600">{money(estimatedProfit)}</strong>
          </p>
        )}
      </form>
    </Modal>
  );
}

/** Ficha de un artículo: producto, cantidad, precio y (en ventas) su garantía. */
function ProductLine({
  line,
  index,
  count,
  product,
  options,
  isSale,
  hint,
  allowNewProduct,
  inArs,
  date,
  settingsDays,
  onSelectProduct,
  onChange,
  onRemove,
}: {
  line: Line;
  index: number;
  count: number;
  product: Product | undefined;
  options: Product[] | undefined;
  isSale: boolean;
  hint?: string;
  allowNewProduct: boolean;
  inArs: boolean;
  date: string;
  settingsDays: number | undefined;
  onSelectProduct: (id: string) => void;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const [editingWarranty, setEditingWarranty] = useState(false);
  const [warrantyDraft, setWarrantyDraft] = useState("");

  // Al cambiar de producto se descarta el editor de garantía abierto.
  useEffect(() => setEditingWarranty(false), [line.productId]);

  const w = isSale ? lineWarranty(product, date, line.editedWarrantyEnd, settingsDays) : null;
  const multiple = count > 1;

  function openWarrantyEditor() {
    setWarrantyDraft(w?.end ?? date);
    setEditingWarranty(true);
  }

  function saveWarrantyEdit() {
    if (!warrantyDraft || (date && warrantyDraft < date)) return;
    onChange({ editedWarrantyEnd: warrantyDraft });
    setEditingWarranty(false);
  }

  return (
    <div className={multiple ? "space-y-4 rounded-xl border border-ink-100 p-3.5" : "space-y-4"}>
      {multiple && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Artículo {index + 1}
          </span>
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
            onClick={onRemove}
            aria-label={`Quitar artículo ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      <Field label={isSale ? "Producto (sólo con stock)" : "Producto"} hint={hint}>
        <div className="relative">
          <select
            className={`input ${product?.color ? "pl-9" : ""}`}
            value={line.productId}
            onChange={(e) => onSelectProduct(e.target.value)}
          >
            <option value="">— Elegí un producto —</option>
            {allowNewProduct && <option value="__new__">＋ Producto nuevo</option>}
            {options?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
                {p.storage ? ` ${p.storage}` : ""}
                {p.color ? ` · ${p.color}` : ""}
                {p.imei ? ` · ${p.category === "notebook" ? "S/N" : "IMEI"} ${p.imei}` : ""} ·
                stock: {p.quantity}
              </option>
            ))}
          </select>
          {product?.color && (
            <ColorDot
              color={product.color}
              className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ring-ink-400/60"
            />
          )}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cantidad">
          <input
            className="input"
            type="number"
            min={1}
            value={line.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </Field>
        <Field label={`${isSale ? "Precio unitario" : "Costo unitario"}${inArs ? " (ARS)" : ""}`}>
          <input
            className="input"
            type="number"
            step="any"
            value={line.unitValue}
            onChange={(e) => onChange({ unitValue: e.target.value })}
          />
        </Field>
      </div>

      {w?.type === "apple" && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            <strong>Garantía Apple</strong>
            {w.appleEnd !== undefined && <> · equipo usado, vigente hasta el {formatDate(w.appleEnd)}</>}
          </span>
        </div>
      )}
      {w?.type === "tienda" && product && (
        <div
          className={`rounded-xl px-3.5 py-2.5 text-sm ${
            w.end ? "bg-ink-50 text-ink-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              {w.end && date ? (
                <>
                  <strong>Garantía de la tienda</strong> ·{" "}
                  {CONDITIONS[product.condition].label.toLowerCase()}: {w.days} días, del{" "}
                  {formatDate(fromDateInputValue(date))} al {formatDate(fromDateInputValue(w.end))}
                  <span className="block text-xs text-ink-400">
                    {line.editedWarrantyEnd
                      ? "Vencimiento editado en esta venta."
                      : "Según la fecha de venta y los días de garantía de Ajustes."}
                  </span>
                </>
              ) : (
                <>
                  Para vender equipos usados, configurá los <strong>días de garantía</strong> en
                  Ajustes o cargá el vencimiento con “Editar garantía”.
                </>
              )}
              {w.expiredAppleEnd !== undefined && (
                <span className="mt-1 block text-xs font-medium text-amber-700">
                  La garantía Apple cargada en la ficha de este equipo venció el{" "}
                  {formatDate(w.expiredAppleEnd)}. Si está mal, corregila en Stock.
                </span>
              )}
            </div>
            {!editingWarranty && (
              <button
                type="button"
                className="btn-secondary shrink-0 px-2.5 py-1.5 text-xs"
                onClick={openWarrantyEditor}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar garantía
              </button>
            )}
          </div>

          {/* Pantallita para editar el vencimiento */}
          {editingWarranty && (
            <div className="mt-3 rounded-xl border border-ink-200 bg-surface p-3 animate-fade-in">
              <Field label="Vence el">
                <DateInput
                  value={warrantyDraft}
                  min={date || undefined}
                  onChange={setWarrantyDraft}
                  // Enter guarda la garantía (sin registrar la venta).
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveWarrantyEdit();
                    }
                  }}
                  autoFocus
                />
              </Field>
              {warrantyDraft && date && (
                <p className="mt-1 text-xs text-ink-400">
                  {warrantyDraft < date
                    ? "No puede vencer antes de la fecha de venta."
                    : `${daysBetweenDateInputs(date, warrantyDraft)} días desde la fecha de venta.`}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                {line.editedWarrantyEnd && settingsDays !== undefined && (
                  <button
                    type="button"
                    className="btn-ghost mr-auto px-3 py-1.5 text-xs"
                    onClick={() => {
                      onChange({ editedWarrantyEnd: null });
                      setEditingWarranty(false);
                    }}
                  >
                    Volver a los días de Ajustes
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => setEditingWarranty(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={!warrantyDraft || (!!date && warrantyDraft < date)}
                  onClick={saveWarrantyEdit}
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
