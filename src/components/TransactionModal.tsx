import { useState, FormEvent, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Modal, Field } from "./ui";
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
import { Loader2, Pencil, ShieldCheck } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  type: TxType;
  /** Producto preseleccionado (p. ej. "Ingresar stock" desde la tabla de Stock). */
  initialProductId?: Id<"products">;
  /** En Compra: permite cargar un producto NUEVO con todos los combos. */
  onCreateNewProduct?: () => void;
};

export default function TransactionModal({
  open,
  onClose,
  type,
  initialProductId,
  onCreateNewProduct,
}: Props) {
  const products = useQuery(api.products.list, open ? {} : "skip");
  const recordSale = useMutation(api.transactions.recordSale);
  const recordPurchase = useMutation(api.transactions.recordPurchase);
  const recordManual = useMutation(api.transactions.recordManual);
  const settings = useQuery(api.settings.getAdmin);
  const { money, moneyIn } = useCurrency();
  const fx = useFx();

  const [productId, setProductId] = useState("");
  const [concept, setConcept] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitValue, setUnitValue] = useState(""); // precio (venta) o costo (compra)
  const [amount, setAmount] = useState(""); // gasto/ingreso
  const [updateCost, setUpdateCost] = useState(false);
  const [payment, setPayment] = useState("Efectivo");
  const [customer, setCustomer] = useState<CustomerSelection>(null);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(toDateInputValue(Date.now()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // "Editar garantía" (usados): vencimiento cargado a mano; null = el de Ajustes.
  const [editedWarrantyEnd, setEditedWarrantyEnd] = useState<string | null>(null);
  const [editingWarranty, setEditingWarranty] = useState(false);
  const [warrantyDraft, setWarrantyDraft] = useState("");

  const isSale = type === "venta";
  const isPurchase = type === "compra";
  const isProductTx = isSale || isPurchase;
  const meta = TX_META[type];

  const selectedProduct = useMemo(
    () => products?.find((p) => p._id === productId),
    [products, productId],
  );

  // Garantía al vender equipos: nuevo → Apple (sin fechas: la calcula Apple desde
  // la activación); usado → de la tienda, desde la fecha de venta y por los días
  // de Ajustes (el backend la calcula igual al registrar), o hasta el vencimiento
  // que se cargue con "Editar garantía".
  const warrantyType =
    isSale && selectedProduct ? warrantyTypeFor(selectedProduct, date) : null;
  // Usado con garantía Apple vigente: vence en la fecha de su ficha.
  const appleWarrantyEnd =
    warrantyType === "apple" && selectedProduct?.condition !== "nuevo"
      ? selectedProduct?.appleWarrantyEnd
      : undefined;
  // Usado con garantía Apple cargada pero ya vencida a la fecha de venta.
  const expiredAppleWarranty =
    warrantyType === "tienda" ? selectedProduct?.appleWarrantyEnd : undefined;
  const settingsDays = settings?.warrantyDays;
  const warrantyEnd =
    editedWarrantyEnd ??
    (date && settingsDays !== undefined ? addDaysToDateInput(date, settingsDays) : null);
  const warrantyDays = date && warrantyEnd ? daysBetweenDateInputs(date, warrantyEnd) : null;

  function openWarrantyEditor() {
    setWarrantyDraft(warrantyEnd ?? date);
    setEditingWarranty(true);
  }

  function saveWarrantyEdit() {
    if (!warrantyDraft || (date && warrantyDraft < date)) return;
    setEditedWarrantyEnd(warrantyDraft);
    setEditingWarranty(false);
  }

  // VENTA: sólo artículos con stock. COMPRA (reposición): sólo artículos por cantidad;
  // los equipos con IMEI (iPhone / iPad) son únicos y entran como producto nuevo.
  const selectable = isSale
    ? products?.filter((p) => p.quantity > 0)
    : isPurchase
      ? products?.filter((p) => p.category !== "iphone" && p.category !== "ipad")
      : products;
  const noStock = isSale && selectable !== undefined && selectable.length === 0;

  function onSelectProduct(id: string) {
    if (id === "__new__") {
      onCreateNewProduct?.();
      return;
    }
    setProductId(id);
    setEditedWarrantyEnd(null);
    setEditingWarranty(false);
    const p = products?.find((x) => x._id === id);
    if (p) setUnitValue(fx.convertFromStore(isSale ? p.salePrice : p.costPrice));
  }

  function onFxCurrencyChange(to: InputCurrency) {
    setUnitValue((v) => fx.convertInput(v, to));
    setAmount((v) => fx.convertInput(v, to));
  }

  // Preseleccionar el producto cuando la lista termina de cargar.
  useEffect(() => {
    if (initialProductId && products && productId === "") {
      const p = products.find((x) => x._id === initialProductId);
      if (p) {
        setProductId(p._id);
        setUnitValue(isSale ? p.salePrice.toString() : p.costPrice.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProductId, products]);

  // Importes en la moneda cargada; `total` siempre en la moneda de la tienda.
  const totalInput = isProductTx
    ? (Number(quantity) || 0) * (Number(unitValue) || 0)
    : Number(amount) || 0;
  const unitStore = fx.toStore(Number(unitValue) || 0);
  const total = isProductTx ? (Number(quantity) || 0) * unitStore : fx.toStore(totalInput);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (fx.error) return setError(fx.error);
    if (!date) return setError("Ingresá una fecha válida (dd/mm/aaaa).");
    setSaving(true);
    try {
      const when = fromDateInputValue(date);
      if (isSale) {
        if (!productId) throw new Error("Elegí un producto.");
        if (customer?.kind === "new" && !customer.data.name.trim()) {
          throw new Error("Ingresá el nombre del cliente (o elegí uno existente).");
        }
        if (warrantyType === "tienda") {
          if (!warrantyEnd) {
            throw new Error(
              "Configurá los días de garantía de usados en Ajustes o usá “Editar garantía”.",
            );
          }
          if (warrantyEnd < date) {
            throw new Error("El vencimiento de la garantía no puede ser anterior a la fecha de venta.");
          }
        }
        await recordSale({
          productId: selectedProduct!._id,
          quantity: Number(quantity),
          unitPrice: unitStore,
          fxRate: fx.fxRate,
          fxAmount: fx.inArs ? totalInput : undefined,
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
          warrantyEnd:
            warrantyType === "tienda" && editedWarrantyEnd
              ? fromDateInputValue(editedWarrantyEnd)
              : undefined,
        });
      } else if (isPurchase) {
        if (!productId) throw new Error("Elegí un producto.");
        await recordPurchase({
          productId: selectedProduct!._id,
          quantity: Number(quantity),
          unitCost: unitStore,
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
            <Field
              label={isSale ? "Producto (sólo con stock)" : "Producto"}
              hint={
                isPurchase && onCreateNewProduct
                  ? "Reposición de accesorios/AirPods. Los iPhone/iPad entran siempre como “Producto nuevo” (cada equipo con IMEI es único)."
                  : noStock
                    ? "No hay artículos con stock. Registrá una Compra primero."
                    : undefined
              }
            >
              <select
                className="input"
                value={productId}
                onChange={(e) => onSelectProduct(e.target.value)}
              >
                <option value="">— Elegí un producto —</option>
                {isPurchase && onCreateNewProduct && (
                  <option value="__new__">＋ Producto nuevo</option>
                )}
                {selectable?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                    {p.storage ? ` ${p.storage}` : ""}
                    {p.imei ? ` · ${p.category === "notebook" ? "S/N" : "IMEI"} ${p.imei}` : ""} ·
                    stock: {p.quantity}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cantidad">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
              <Field
                label={`${isSale ? "Precio unitario" : "Costo unitario"}${fx.inArs ? " (ARS)" : ""}`}
              >
                <input
                  className="input"
                  type="number"
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                />
              </Field>
            </div>
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

        {warrantyType === "apple" && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>
              <strong>Garantía Apple</strong>
              {appleWarrantyEnd !== undefined && (
                <> · equipo usado, vigente hasta el {formatDate(appleWarrantyEnd)}</>
              )}
            </span>
          </div>
        )}
        {warrantyType === "tienda" && (
          <div
            className={`rounded-xl px-3.5 py-2.5 text-sm ${
              warrantyEnd ? "bg-ink-50 text-ink-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                {warrantyEnd && date ? (
                  <>
                    <strong>Garantía de la tienda</strong> ·{" "}
                    {CONDITIONS[selectedProduct!.condition].label.toLowerCase()}: {warrantyDays}{" "}
                    días, del {formatDate(fromDateInputValue(date))} al{" "}
                    {formatDate(fromDateInputValue(warrantyEnd))}
                    <span className="block text-xs text-ink-400">
                      {editedWarrantyEnd
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
                {expiredAppleWarranty !== undefined && (
                  <span className="mt-1 block text-xs font-medium text-amber-700">
                    La garantía Apple cargada en la ficha de este equipo venció el{" "}
                    {formatDate(expiredAppleWarranty)}. Si está mal, corregila en Stock.
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
                  {editedWarrantyEnd && settingsDays !== undefined && (
                    <button
                      type="button"
                      className="btn-ghost mr-auto px-3 py-1.5 text-xs"
                      onClick={() => {
                        setEditedWarrantyEnd(null);
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
          <span className="text-sm font-medium">Total {meta.label.toLowerCase()}</span>
          <span className="text-right">
            <span className="block text-lg font-bold">{money(total)}</span>
            {fx.inArs && (
              <span className="block text-xs font-medium opacity-80">
                {moneyIn(totalInput, "ARS")}
              </span>
            )}
          </span>
        </div>
        {isSale && selectedProduct && (
          <p className="text-xs text-ink-500">
            Ganancia estimada:{" "}
            <strong className="text-emerald-600">
              {money((unitStore - selectedProduct.costPrice) * (Number(quantity) || 0))}
            </strong>
          </p>
        )}
      </form>
    </Modal>
  );
}
