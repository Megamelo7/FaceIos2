import { Doc } from "../../convex/_generated/dataModel";

/** IMEI (o N° de serie, en notebooks) del equipo vendido. */
export default function SaleImei({ sale }: { sale: Doc<"transactions"> }) {
  if (!sale.imei) return null;
  return (
    <p className="text-xs text-ink-400">
      {sale.category === "notebook" ? "N° de serie" : "IMEI"}{" "}
      <span className="font-mono text-ink-600">{sale.imei}</span>
    </p>
  );
}
