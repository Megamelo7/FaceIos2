import { Doc } from "../../convex/_generated/dataModel";
import { formatDate, toDateInputValue } from "../lib/format";

/**
 * Garantía de una venta en los listados: "Garantía Apple" (nuevo, sin fecha: la
 * calcula Apple), "Garantía Apple · hasta 15 mar 2027" (usado con garantía Apple)
 * o "Garantía tienda 90 días · hasta 27 dic 2026". En rojo si venció.
 */
export default function SaleWarranty({ sale }: { sale: Doc<"transactions"> }) {
  if (!sale.warrantyType) return null;
  const kind = sale.warrantyType === "apple" ? "Apple" : `tienda ${sale.warrantyDays ?? 0} días`;
  if (sale.warrantyEnd === undefined) {
    return <p className="text-xs text-ink-400">Garantía {kind}</p>;
  }
  // Vence al terminar el día de fin.
  const expired = toDateInputValue(sale.warrantyEnd) < toDateInputValue(Date.now());
  return (
    <p className={`text-xs ${expired ? "text-red-600" : "text-ink-400"}`}>
      Garantía {kind} · {expired ? "vencida el" : "hasta"} {formatDate(sale.warrantyEnd)}
    </p>
  );
}
