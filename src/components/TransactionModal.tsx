import { useState, FormEvent, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Modal, Field } from "./ui";
import CustomerPicker, { CustomerSelection } from "./CustomerPicker";
import { TX_META, TxType, PAYMENT_METHODS } from "../lib/categories";
import { toDateInputValue, fromDateInputValue } from "../lib/format";
import { useCurrency } from "../lib/useCurrency";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  type: TxType;
  /** Producto preseleccionado (p. ej. "Ingresar stock" desde la tabla de Stock). */
  initialProductId?: Id<"products">;
};

export default function TransactionModal({ open, onClose, type, initialProductId }: Props) {
  const products = useQuery(api.products.list, open ? {} : "skip");
  const recordSale = useMutation(api.transactions.recordSale);
  const recordPurchase = useMutation(api.transactions.recordPurchase);
  const recordManual = useMutation(api.transactions.recordManual);
  const { money } = useCurrency();

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

  const isSale = type === "venta";
  const isPurchase = type === "compra";
  const isProductTx = isSale || isPurchase;
  const meta = TX_META[type];

  const selectedProduct = useMemo(
    () => products?.find((p) => p._id === productId),
    [products, productId],
  );

  function onSelectProduct(id: string) {
    setProductId(id);
    const p = products?.find((x) => x._id === id);
    if (p) setUnitValue(isSale ? p.salePrice.toString() : p.costPrice.toString());
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

  const total = isProductTx
    ? (Number(quantity) || 0) * (Number(unitValue) || 0)
    : Number(amount) || 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const when = fromDateInputValue(date);
      if (isSale) {
        if (!productId) throw new Error("Elegí un producto.");
        if (customer?.kind === "new" && !customer.data.name.trim()) {
          throw new Error("Ingresá el nombre del cliente (o elegí uno existente).");
        }
        await recordSale({
          productId: selectedProduct!._id,
          quantity: Number(quantity),
          unitPrice: Number(unitValue),
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
        if (!productId) throw new Error("Elegí un producto.");
        await recordPurchase({
          productId: selectedProduct!._id,
          quantity: Number(quantity),
          unitCost: Number(unitValue),
          updateCost,
          paymentMethod: payment,
          notes: notes.trim() || undefined,
          date: when,
        });
      } else {
        if (!concept.trim()) throw new Error("Ingresá un concepto.");
        await recordManual({
          type: type as "gasto" | "ingreso",
          amount: Number(amount),
          concept: concept.trim(),
          paymentMethod: payment,
          notes: notes.trim() || undefined,
          date: when,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar.");
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

        {isProductTx ? (
          <>
            <Field label="Producto">
              <select
                className="input"
                value={productId}
                onChange={(e) => onSelectProduct(e.target.value)}
              >
                <option value="">— Elegí un producto —</option>
                {products?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                    {p.storage ? ` ${p.storage}` : ""} · stock: {p.quantity}
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
              <Field label={isSale ? "Precio unitario" : "Costo unitario"}>
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
            <Field label="Monto">
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
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
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
          <span className="text-sm font-medium">Total {meta.label.toLowerCase()}</span>
          <span className="text-lg font-bold">{money(total)}</span>
        </div>
        {isSale && selectedProduct && (
          <p className="text-xs text-ink-500">
            Ganancia estimada:{" "}
            <strong className="text-emerald-600">
              {money((Number(unitValue) - selectedProduct.costPrice) * (Number(quantity) || 0))}
            </strong>
          </p>
        )}
      </form>
    </Modal>
  );
}
