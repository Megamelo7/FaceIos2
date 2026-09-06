import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Esquema de la base de datos.
 *
 * - `products`: inventario (iPhones y accesorios / ítems complementarios).
 * - `transactions`: registro de TODAS las operaciones (ventas, compras, gastos,
 *   ingresos) para el balance de finanzas.
 * - `settings`: configuración de la tienda (nombre, contacto de WhatsApp, etc.).
 * - `...authTables`: tablas que necesita Convex Auth para el login.
 */
export default defineSchema({
  ...authTables,

  products: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("iphone"),
      v.literal("ipad"),
      v.literal("notebook"),
      v.literal("airpods"),
      v.literal("accesorio"),
      v.literal("otro"),
    ),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    storage: v.optional(v.string()),
    color: v.optional(v.string()),
    condition: v.union(
      v.literal("nuevo"),
      v.literal("usado"),
      v.literal("reacondicionado"),
    ),
    batteryHealth: v.optional(v.number()),
    batteryType: v.optional(
      v.union(v.literal("original"), v.literal("reacondicionada")),
    ),
    // IMEI (15 dígitos) para iPhone/iPad; número de serie libre para notebooks.
    imei: v.optional(v.string()),
    costPrice: v.number(),
    salePrice: v.number(),
    quantity: v.number(),
    minStock: v.optional(v.number()),
    status: v.union(
      v.literal("disponible"),
      v.literal("reservado"),
      v.literal("agotado"),
      v.literal("oculto"),
    ),
    featured: v.optional(v.boolean()),
    // Fotos del producto, guardadas en Convex Storage (la primera es la principal).
    images: v.optional(v.array(v.id("_storage"))),
    // Legacy: URL de imagen del formulario anterior (ya no se usa, se conserva por compatibilidad).
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_imei", ["imei"]),

  transactions: defineTable({
    type: v.union(
      v.literal("venta"),
      v.literal("compra"),
      v.literal("gasto"),
      v.literal("ingreso"),
    ),
    productId: v.optional(v.id("products")),
    productName: v.optional(v.string()),
    category: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    // Monto total del movimiento (siempre positivo). El signo se determina por `type`.
    amount: v.number(),
    // Ganancia neta de la operación (para ventas): (precio - costo) * cantidad.
    profit: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    // Cliente vinculado (opcional) + snapshot de nombre/contacto para el historial.
    customerId: v.optional(v.id("customers")),
    customerName: v.optional(v.string()),
    customerContact: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.number(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_date", ["date"])
    .index("by_customer", ["customerId"]),

  /** Clientes: datos básicos para asociar a las ventas. */
  customers: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_email", ["email"]),

  /**
   * Catálogo de modelos (configuración): modelo + colores + capacidades
   * disponibles. Alimenta los combos del alta de artículo. Sólo para las
   * categorías de equipos Apple; accesorios/otros se cargan a mano.
   */
  deviceModels: defineTable({
    category: v.union(
      v.literal("iphone"),
      v.literal("ipad"),
      v.literal("notebook"),
      v.literal("airpods"),
    ),
    name: v.string(),
    colors: v.array(v.string()),
    storages: v.array(v.string()),
    order: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_category", ["category"]),

  settings: defineTable({
    key: v.string(),
    storeName: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    instagram: v.optional(v.string()),
    currency: v.optional(v.string()),
    heroTitle: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
  }).index("by_key", ["key"]),
});
