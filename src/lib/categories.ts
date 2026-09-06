import { Smartphone, Headphones, Cable, Package, LucideIcon } from "lucide-react";

export type Category = "iphone" | "accesorio" | "airpods" | "otro";
export type Condition = "nuevo" | "usado" | "reacondicionado";
export type ProductStatus = "disponible" | "reservado" | "agotado" | "oculto";
export type TxType = "venta" | "compra" | "gasto" | "ingreso";

export const CATEGORIES: Record<
  Category,
  { label: string; plural: string; icon: LucideIcon; color: string }
> = {
  iphone: { label: "iPhone", plural: "iPhones", icon: Smartphone, color: "text-brand-600 bg-brand-50" },
  airpods: { label: "AirPods", plural: "AirPods", icon: Headphones, color: "text-violet-600 bg-violet-50" },
  accesorio: { label: "Accesorio", plural: "Accesorios", icon: Cable, color: "text-teal-600 bg-teal-50" },
  otro: { label: "Otro", plural: "Otros", icon: Package, color: "text-amber-600 bg-amber-50" },
};

export const CATEGORY_ORDER: Category[] = ["iphone", "airpods", "accesorio", "otro"];

export const CONDITIONS: Record<Condition, { label: string; color: string }> = {
  nuevo: { label: "Nuevo", color: "bg-emerald-50 text-emerald-700" },
  usado: { label: "Usado", color: "bg-amber-50 text-amber-700" },
  reacondicionado: { label: "Reacondicionado", color: "bg-sky-50 text-sky-700" },
};

export type BatteryType = "original" | "reacondicionada";

export const BATTERY_TYPES: Record<BatteryType, { label: string; color: string }> = {
  original: { label: "Batería original", color: "bg-emerald-50 text-emerald-700" },
  reacondicionada: { label: "Batería reacondicionada", color: "bg-amber-50 text-amber-700" },
};

export const STATUSES: Record<ProductStatus, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "bg-emerald-50 text-emerald-700" },
  reservado: { label: "Reservado", color: "bg-amber-50 text-amber-700" },
  agotado: { label: "Agotado", color: "bg-red-50 text-red-700" },
  oculto: { label: "Oculto", color: "bg-ink-100 text-ink-500" },
};

export const TX_META: Record<TxType, { label: string; color: string; sign: 1 | -1 }> = {
  venta: { label: "Venta", color: "bg-emerald-50 text-emerald-700", sign: 1 },
  ingreso: { label: "Ingreso", color: "bg-sky-50 text-sky-700", sign: 1 },
  compra: { label: "Compra", color: "bg-orange-50 text-orange-700", sign: -1 },
  gasto: { label: "Gasto", color: "bg-red-50 text-red-700", sign: -1 },
};

export const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Débito", "Crypto", "Otro"];
