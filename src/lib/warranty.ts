import { Category, Condition } from "./categories";
import { toDateInputValue } from "./format";

/** Equipos a los que se les registra garantía al venderlos. */
export const WARRANTY_CATEGORIES: Category[] = ["iphone", "ipad", "notebook", "airpods"];

export type WarrantyType = "apple" | "tienda";

type WarrantyProduct = { category: Category; condition: Condition; appleWarrantyEnd?: number };

/** Usado con garantía Apple vigente a la fecha de venta (<input type="date">). */
export function hasAppleWarranty(p: WarrantyProduct, saleDate: string): boolean {
  return p.appleWarrantyEnd !== undefined && toDateInputValue(p.appleWarrantyEnd) >= saleDate;
}

/**
 * Garantía al vender un equipo: nuevo → Garantía Apple (sin fechas: la calcula
 * Apple desde la activación); usado con garantía Apple vigente → Apple (hasta la
 * fecha de su ficha); usado sin garantía Apple → de la tienda, desde la fecha de
 * venta y por los días de Ajustes. Misma regla que `saleWarranty` en
 * convex/transactions.ts.
 */
export function warrantyTypeFor(p: WarrantyProduct, saleDate: string): WarrantyType | null {
  if (!WARRANTY_CATEGORIES.includes(p.category)) return null;
  if (p.condition === "nuevo" || hasAppleWarranty(p, saleDate)) return "apple";
  return "tienda";
}
