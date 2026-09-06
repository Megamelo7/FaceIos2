import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency, formatCurrencyShort } from "./format";

/** Devuelve la moneda configurada y formateadores listos para usar. */
export function useCurrency() {
  const settings = useQuery(api.settings.getAdmin);
  const currency = settings?.currency ?? "ARS";
  return {
    currency,
    money: (v: number) => formatCurrency(v, currency),
    moneyShort: (v: number) => formatCurrencyShort(v, currency),
  };
}
