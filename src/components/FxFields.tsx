import { useState } from "react";
import { Field } from "./ui";
import { useCurrency } from "../lib/useCurrency";

export type InputCurrency = "USD" | "ARS";

/**
 * Carga en pesos con la tienda en dólares: los importes se escriben en ARS y
 * se graban en USD dividiendo por la cotización (ARS por US$).
 */
export function useFx() {
  const { currency } = useCurrency();
  const [inputCurrency, setInputCurrency] = useState<InputCurrency>("USD");
  const [rate, setRate] = useState("");

  const enabled = currency === "USD";
  const inArs = enabled && inputCurrency === "ARS";
  const rateNum = Number(rate) || 0;

  /** Importe cargado → moneda de la tienda (2 decimales). */
  const toStore = (value: number) =>
    inArs ? (rateNum > 0 ? Math.round((value / rateNum) * 100) / 100 : 0) : value;

  /** Importe de la tienda → valor para el input en la moneda cargada. */
  const convertFromStore = (value: number) =>
    inArs ? (rateNum > 0 ? String(Math.round(value * rateNum)) : "") : String(value);

  /** Pasa un importe ya cargado a la otra moneda ("" si falta la cotización). */
  const convertInput = (value: string, to: InputCurrency) => {
    if (value.trim() === "" || to === inputCurrency) return value;
    if (!(rateNum > 0)) return "";
    const n = Number(value) || 0;
    return String(to === "ARS" ? Math.round(n * rateNum) : Math.round((n / rateNum) * 100) / 100);
  };

  return {
    enabled,
    inArs,
    inputCurrency,
    setInputCurrency,
    rate,
    setRate,
    toStore,
    convertFromStore,
    convertInput,
    fxRate: inArs ? rateNum : undefined,
    /** Mensaje de error si falta la cotización. */
    error: inArs && !(rateNum > 0) ? "Ingresá la cotización del dólar." : null,
  };
}

export type Fx = ReturnType<typeof useFx>;

/** Combo de moneda + cotización (sólo visible si la tienda está en dólares). */
export default function FxFields({
  fx,
  onCurrencyChange,
}: {
  fx: Fx;
  /** Para convertir los importes ya cargados antes de cambiar la moneda. */
  onCurrencyChange?: (to: InputCurrency) => void;
}) {
  if (!fx.enabled) return null;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Moneda">
        <select
          className="input"
          value={fx.inputCurrency}
          onChange={(e) => {
            const to = e.target.value as InputCurrency;
            onCurrencyChange?.(to);
            fx.setInputCurrency(to);
          }}
        >
          <option value="USD">Dólar (USD)</option>
          <option value="ARS">Peso (ARS)</option>
        </select>
      </Field>
      {fx.inArs && (
        <Field label="Cotización (ARS por US$)">
          <input
            className="input"
            type="number"
            min={0}
            value={fx.rate}
            onChange={(e) => fx.setRate(e.target.value)}
            placeholder="Ej: 1400"
            autoFocus
          />
        </Field>
      )}
    </div>
  );
}
