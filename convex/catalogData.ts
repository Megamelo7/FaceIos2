/**
 * Catálogo de modelos Apple con sus colores y capacidades oficiales.
 * Ordenado cronológicamente (más antiguo → más nuevo). En la app se muestra
 * el más nuevo primero. Se puede editar/ampliar desde el panel (Modelos).
 *
 * Cobertura: iPhone 11 en adelante, iPad, MacBook (Notebook) y AirPods.
 */
export type CatalogEntry = {
  category: "iphone" | "ipad" | "notebook" | "airpods";
  name: string;
  colors: string[];
  storages: string[];
};

const GB = (...v: string[]) => v;

export const APPLE_CATALOG: CatalogEntry[] = [
  // ───────────────────────────── iPhone ─────────────────────────────
  { category: "iphone", name: "iPhone 11", colors: ["Negro", "Verde", "Amarillo", "Púrpura", "(PRODUCT)RED", "Blanco"], storages: GB("64GB", "128GB", "256GB") },
  { category: "iphone", name: "iPhone 11 Pro", colors: ["Gris espacial", "Plata", "Oro", "Verde noche"], storages: GB("64GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 11 Pro Max", colors: ["Gris espacial", "Plata", "Oro", "Verde noche"], storages: GB("64GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone SE (2ª gen, 2020)", colors: ["Negro", "Blanco", "(PRODUCT)RED"], storages: GB("64GB", "128GB", "256GB") },
  { category: "iphone", name: "iPhone 12 mini", colors: ["Negro", "Blanco", "(PRODUCT)RED", "Verde", "Azul", "Púrpura"], storages: GB("64GB", "128GB", "256GB") },
  { category: "iphone", name: "iPhone 12", colors: ["Negro", "Blanco", "(PRODUCT)RED", "Verde", "Azul", "Púrpura"], storages: GB("64GB", "128GB", "256GB") },
  { category: "iphone", name: "iPhone 12 Pro", colors: ["Grafito", "Plata", "Oro", "Azul pacífico"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 12 Pro Max", colors: ["Grafito", "Plata", "Oro", "Azul pacífico"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 13 mini", colors: ["Rosa", "Azul", "Medianoche", "Blanco estelar", "(PRODUCT)RED", "Verde"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 13", colors: ["Rosa", "Azul", "Medianoche", "Blanco estelar", "(PRODUCT)RED", "Verde"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 13 Pro", colors: ["Grafito", "Oro", "Plata", "Azul Sierra", "Verde alpino"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 13 Pro Max", colors: ["Grafito", "Oro", "Plata", "Azul Sierra", "Verde alpino"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone SE (3ª gen, 2022)", colors: ["Medianoche", "Blanco estelar", "(PRODUCT)RED"], storages: GB("64GB", "128GB", "256GB") },
  { category: "iphone", name: "iPhone 14", colors: ["Azul", "Púrpura", "Medianoche", "Blanco estelar", "(PRODUCT)RED", "Amarillo"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 14 Plus", colors: ["Azul", "Púrpura", "Medianoche", "Blanco estelar", "(PRODUCT)RED", "Amarillo"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 14 Pro", colors: ["Negro espacial", "Plata", "Oro", "Morado oscuro"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 14 Pro Max", colors: ["Negro espacial", "Plata", "Oro", "Morado oscuro"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 15", colors: ["Negro", "Azul", "Verde", "Amarillo", "Rosa"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 15 Plus", colors: ["Negro", "Azul", "Verde", "Amarillo", "Rosa"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 15 Pro", colors: ["Titanio negro", "Titanio blanco", "Titanio azul", "Titanio natural"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 15 Pro Max", colors: ["Titanio negro", "Titanio blanco", "Titanio azul", "Titanio natural"], storages: GB("256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 16", colors: ["Negro", "Blanco", "Rosa", "Verde azulado", "Ultramarino"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 16 Plus", colors: ["Negro", "Blanco", "Rosa", "Verde azulado", "Ultramarino"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 16 Pro", colors: ["Titanio negro", "Titanio blanco", "Titanio natural", "Titanio desierto"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 16 Pro Max", colors: ["Titanio negro", "Titanio blanco", "Titanio natural", "Titanio desierto"], storages: GB("256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 16e", colors: ["Negro", "Blanco"], storages: GB("128GB", "256GB", "512GB") },
  { category: "iphone", name: "iPhone 17", colors: ["Lavanda", "Salvia", "Azul niebla", "Blanco", "Negro"], storages: GB("256GB", "512GB") },
  { category: "iphone", name: "iPhone Air", colors: ["Negro espacial", "Blanco nube", "Dorado claro", "Azul cielo"], storages: GB("256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 17 Pro", colors: ["Naranja cósmico", "Azul profundo", "Plata"], storages: GB("256GB", "512GB", "1TB") },
  { category: "iphone", name: "iPhone 17 Pro Max", colors: ["Naranja cósmico", "Azul profundo", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },

  // ────────────────────────────── iPad ──────────────────────────────
  { category: "ipad", name: "iPad (9ª gen, 2021)", colors: ["Gris espacial", "Plata"], storages: GB("64GB", "256GB") },
  { category: "ipad", name: "iPad (10ª gen, 2022)", colors: ["Azul", "Rosa", "Amarillo", "Plata"], storages: GB("64GB", "256GB") },
  { category: "ipad", name: "iPad (A16, 2025)", colors: ["Azul", "Rosa", "Amarillo", "Plata"], storages: GB("128GB", "256GB", "512GB") },
  { category: "ipad", name: "iPad mini (6ª gen, 2021)", colors: ["Gris espacial", "Rosa", "Púrpura", "Blanco estelar"], storages: GB("64GB", "256GB") },
  { category: "ipad", name: "iPad mini (A17 Pro, 2024)", colors: ["Gris espacial", "Azul", "Púrpura", "Blanco estelar"], storages: GB("128GB", "256GB", "512GB") },
  { category: "ipad", name: "iPad Air (4ª gen, 2020)", colors: ["Gris espacial", "Plata", "Oro rosa", "Verde", "Azul cielo"], storages: GB("64GB", "256GB") },
  { category: "ipad", name: "iPad Air (5ª gen, M1, 2022)", colors: ["Gris espacial", "Blanco estelar", "Rosa", "Púrpura", "Azul"], storages: GB("64GB", "256GB") },
  { category: "ipad", name: "iPad Air 11\" (M2, 2024)", colors: ["Gris espacial", "Blanco estelar", "Púrpura", "Azul"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "ipad", name: "iPad Air 13\" (M2, 2024)", colors: ["Gris espacial", "Blanco estelar", "Púrpura", "Azul"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "ipad", name: "iPad Air 11\" (M3, 2025)", colors: ["Gris espacial", "Blanco estelar", "Púrpura", "Azul"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "ipad", name: "iPad Air 13\" (M3, 2025)", colors: ["Gris espacial", "Blanco estelar", "Púrpura", "Azul"], storages: GB("128GB", "256GB", "512GB", "1TB") },
  { category: "ipad", name: "iPad Pro 11\" (M1, 2021)", colors: ["Gris espacial", "Plata"], storages: GB("128GB", "256GB", "512GB", "1TB", "2TB") },
  { category: "ipad", name: "iPad Pro 12.9\" (M1, 2021)", colors: ["Gris espacial", "Plata"], storages: GB("128GB", "256GB", "512GB", "1TB", "2TB") },
  { category: "ipad", name: "iPad Pro 11\" (M2, 2022)", colors: ["Gris espacial", "Plata"], storages: GB("128GB", "256GB", "512GB", "1TB", "2TB") },
  { category: "ipad", name: "iPad Pro 12.9\" (M2, 2022)", colors: ["Gris espacial", "Plata"], storages: GB("128GB", "256GB", "512GB", "1TB", "2TB") },
  { category: "ipad", name: "iPad Pro 11\" (M4, 2024)", colors: ["Negro espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "ipad", name: "iPad Pro 13\" (M4, 2024)", colors: ["Negro espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "ipad", name: "iPad Pro 11\" (M5, 2025)", colors: ["Negro espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "ipad", name: "iPad Pro 13\" (M5, 2025)", colors: ["Negro espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },

  // ─────────────────────── Notebook (MacBook) ───────────────────────
  { category: "notebook", name: "MacBook Air 13\" (M1, 2020)", colors: ["Gris espacial", "Plata", "Oro"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Air 13\" (M2, 2022)", colors: ["Medianoche", "Blanco estelar", "Gris espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Air 15\" (M2, 2023)", colors: ["Medianoche", "Blanco estelar", "Gris espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Air 13\" (M3, 2024)", colors: ["Medianoche", "Blanco estelar", "Gris espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Air 15\" (M3, 2024)", colors: ["Medianoche", "Blanco estelar", "Gris espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Air 13\" (M4, 2025)", colors: ["Azul cielo", "Medianoche", "Blanco estelar", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Air 15\" (M4, 2025)", colors: ["Azul cielo", "Medianoche", "Blanco estelar", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Pro 13\" (M1, 2020)", colors: ["Gris espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Pro 13\" (M2, 2022)", colors: ["Gris espacial", "Plata"], storages: GB("256GB", "512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Pro 14\" (M1 Pro/Max, 2021)", colors: ["Gris espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB", "8TB") },
  { category: "notebook", name: "MacBook Pro 16\" (M1 Pro/Max, 2021)", colors: ["Gris espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB", "8TB") },
  { category: "notebook", name: "MacBook Pro 14\" (M2 Pro/Max, 2023)", colors: ["Gris espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB", "8TB") },
  { category: "notebook", name: "MacBook Pro 16\" (M2 Pro/Max, 2023)", colors: ["Gris espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB", "8TB") },
  { category: "notebook", name: "MacBook Pro 14\" (M3, 2023)", colors: ["Gris espacial", "Plata"], storages: GB("512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Pro 14\" (M3 Pro/Max, 2023)", colors: ["Negro espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB", "8TB") },
  { category: "notebook", name: "MacBook Pro 16\" (M3 Pro/Max, 2023)", colors: ["Negro espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB", "8TB") },
  { category: "notebook", name: "MacBook Pro 14\" (M4, 2024)", colors: ["Negro espacial", "Plata"], storages: GB("512GB", "1TB", "2TB") },
  { category: "notebook", name: "MacBook Pro 14\" (M4 Pro/Max, 2024)", colors: ["Negro espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB", "8TB") },
  { category: "notebook", name: "MacBook Pro 16\" (M4 Pro/Max, 2024)", colors: ["Negro espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB", "8TB") },
  { category: "notebook", name: "MacBook Pro 14\" (M5, 2025)", colors: ["Negro espacial", "Plata"], storages: GB("512GB", "1TB", "2TB", "4TB") },

  // ───────────────────────── AirPods (auriculares) ─────────────────────────
  { category: "airpods", name: "AirPods (2ª gen)", colors: ["Blanco"], storages: [] },
  { category: "airpods", name: "AirPods (3ª gen)", colors: ["Blanco"], storages: [] },
  { category: "airpods", name: "AirPods 4", colors: ["Blanco"], storages: [] },
  { category: "airpods", name: "AirPods 4 con cancelación de ruido", colors: ["Blanco"], storages: [] },
  { category: "airpods", name: "AirPods Pro (1ª gen)", colors: ["Blanco"], storages: [] },
  { category: "airpods", name: "AirPods Pro 2 (Lightning)", colors: ["Blanco"], storages: [] },
  { category: "airpods", name: "AirPods Pro 2 (USB-C)", colors: ["Blanco"], storages: [] },
  { category: "airpods", name: "AirPods Pro 3", colors: ["Blanco"], storages: [] },
  { category: "airpods", name: "AirPods Max (2020)", colors: ["Gris espacial", "Plata", "Verde", "Azul cielo", "Rosa"], storages: [] },
  { category: "airpods", name: "AirPods Max (USB-C, 2024)", colors: ["Medianoche", "Blanco estelar", "Azul", "Púrpura", "Naranja"], storages: [] },
];
