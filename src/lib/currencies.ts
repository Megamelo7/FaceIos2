/** Monedas disponibles para la tienda: peso argentino o dólar. */
export type CurrencyOption = { code: string; label: string; symbol: string };

export const CURRENCIES: CurrencyOption[] = [
  { code: "ARS", label: "Peso argentino (ARS)", symbol: "$" },
  { code: "USD", label: "Dólar (USD)", symbol: "US$" },
];

/** Símbolo para mostrar; si la moneda no está en la lista, usa el código. */
export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
