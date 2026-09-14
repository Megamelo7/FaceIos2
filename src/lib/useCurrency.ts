import { useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency, formatCurrencyShort } from "./format";
import { currencySymbol } from "./currencies";

/* ───────── Ocultar importes (botón del ojo en la barra del panel) ───────── */

const HIDE_KEY = "faceios2-hide-amounts";
const listeners = new Set<() => void>();

function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

let hidden = readHidden();

function setHidden(value: boolean) {
  hidden = value;
  try {
    localStorage.setItem(HIDE_KEY, value ? "1" : "0");
  } catch {
    // Sin persistencia: vale para esta pestaña.
  }
  listeners.forEach((l) => l());
}

/** Estado global de "ocultar importes" (se recuerda entre sesiones). */
export function useHideAmounts() {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => hidden,
  );
  return { hidden: value, toggle: () => setHidden(!value) };
}

const masked = (currency: string) => `${currencySymbol(currency)} ••••`;

/** Devuelve la moneda configurada y formateadores listos para usar (respetan "ocultar importes"). */
export function useCurrency() {
  const settings = useQuery(api.settings.getAdmin);
  const currency = settings?.currency ?? "ARS";
  const { hidden: isHidden } = useHideAmounts();
  return {
    currency,
    money: (v: number) => (isHidden ? masked(currency) : formatCurrency(v, currency)),
    moneyShort: (v: number) => (isHidden ? masked(currency) : formatCurrencyShort(v, currency)),
    /** Importe en otra moneda (p. ej. el monto original en pesos). */
    moneyIn: (v: number, code: string) => (isHidden ? masked(code) : formatCurrency(v, code)),
  };
}
