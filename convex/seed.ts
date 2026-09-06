import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Carga datos de ejemplo. Ejecutar una sola vez con:
 *   npx convex run seed:run
 * Para forzar recarga (borra datos existentes):
 *   npx convex run seed:run '{"force": true}'
 */
export const run = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("products").take(1);
    if (existing.length > 0 && !args.force) {
      return "Ya existen productos. Usá {\"force\": true} para recargar.";
    }
    if (args.force) {
      for (const p of await ctx.db.query("products").collect()) await ctx.db.delete(p._id);
      for (const t of await ctx.db.query("transactions").collect()) await ctx.db.delete(t._id);
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    type Seed = {
      name: string;
      category: "iphone" | "accesorio" | "airpods" | "otro";
      brand?: string;
      model?: string;
      storage?: string;
      color?: string;
      condition: "nuevo" | "usado" | "reacondicionado";
      batteryHealth?: number;
      batteryType?: "original" | "reacondicionada";
      costPrice: number;
      salePrice: number;
      quantity: number;
      minStock?: number;
      featured?: boolean;
      description?: string;
      imageUrl?: string;
    };

    const seeds: Seed[] = [
      {
        name: "iPhone 15 Pro Max",
        category: "iphone", brand: "Apple", model: "iPhone 15 Pro Max",
        storage: "256GB", color: "Titanio Natural", condition: "nuevo",
        costPrice: 1150000, salePrice: 1450000, quantity: 4, featured: true,
        description: "Sellado, garantía oficial. Chip A17 Pro, cámara 48MP.",
      },
      {
        name: "iPhone 15",
        category: "iphone", brand: "Apple", model: "iPhone 15",
        storage: "128GB", color: "Negro", condition: "nuevo",
        costPrice: 780000, salePrice: 980000, quantity: 6, featured: true,
        description: "Nuevo, sellado. USB-C, Dynamic Island.",
      },
      {
        name: "iPhone 14",
        category: "iphone", brand: "Apple", model: "iPhone 14",
        storage: "128GB", color: "Azul", condition: "nuevo",
        costPrice: 640000, salePrice: 820000, quantity: 3,
        description: "Nuevo con garantía.",
      },
      {
        name: "iPhone 13",
        category: "iphone", brand: "Apple", model: "iPhone 13",
        storage: "128GB", color: "Blanco Estrella", condition: "usado",
        batteryHealth: 89, batteryType: "original",
        costPrice: 480000, salePrice: 620000, quantity: 2, featured: true,
        description: "Usado impecable, batería 89%. Incluye caja y cargador.",
      },
      {
        name: "iPhone SE (2022)",
        category: "iphone", brand: "Apple", model: "iPhone SE",
        storage: "64GB", color: "Medianoche", condition: "reacondicionado",
        batteryHealth: 95, batteryType: "reacondicionada",
        costPrice: 320000, salePrice: 430000, quantity: 5,
        description: "Reacondicionado grado A. Ideal como primer iPhone.",
      },
      {
        name: "AirPods Pro (2da gen)",
        category: "airpods", brand: "Apple", model: "AirPods Pro 2",
        condition: "nuevo", costPrice: 260000, salePrice: 340000, quantity: 8, featured: true,
        description: "Cancelación de ruido, estuche USB-C.",
      },
      {
        name: "AirPods (3ra gen)",
        category: "airpods", brand: "Apple", model: "AirPods 3",
        condition: "nuevo", costPrice: 180000, salePrice: 240000, quantity: 6,
        description: "Audio espacial, resistente al agua.",
      },
      {
        name: "Cargador USB-C 20W",
        category: "accesorio", brand: "Apple", condition: "nuevo",
        costPrice: 18000, salePrice: 32000, quantity: 20, minStock: 5,
        description: "Carga rápida original.",
      },
      {
        name: "Cable USB-C a USB-C (1m)",
        category: "accesorio", brand: "Apple", condition: "nuevo",
        costPrice: 12000, salePrice: 22000, quantity: 25, minStock: 5,
        description: "Cable de carga y datos.",
      },
      {
        name: "Funda silicona iPhone 15",
        category: "accesorio", brand: "Genérica", color: "Varios", condition: "nuevo",
        costPrice: 6000, salePrice: 15000, quantity: 30, minStock: 8,
        description: "Varios colores disponibles.",
      },
      {
        name: "Vidrio templado 9H",
        category: "accesorio", condition: "nuevo",
        costPrice: 2500, salePrice: 9000, quantity: 40, minStock: 10,
        description: "Protector de pantalla. Colocación sin costo.",
      },
    ];

    const ids: Record<string, Id<"products">> = {};
    for (const s of seeds) {
      const id = await ctx.db.insert("products", {
        ...s,
        status: s.quantity > 0 ? "disponible" : "agotado",
        createdAt: now,
        updatedAt: now,
      });
      ids[s.name] = id;
    }

    // Ventas de ejemplo repartidas en los últimos meses.
    const ventas: {
      name: string; qty: number; price: number; daysAgo: number; pay: string; cliente?: string;
    }[] = [
      { name: "iPhone 15", qty: 1, price: 980000, daysAgo: 2, pay: "Transferencia", cliente: "Martín G." },
      { name: "AirPods Pro (2da gen)", qty: 1, price: 340000, daysAgo: 3, pay: "Efectivo", cliente: "Lucía P." },
      { name: "Cargador USB-C 20W", qty: 2, price: 32000, daysAgo: 5, pay: "Efectivo" },
      { name: "iPhone 13", qty: 1, price: 620000, daysAgo: 12, pay: "Transferencia", cliente: "Diego R." },
      { name: "Vidrio templado 9H", qty: 3, price: 9000, daysAgo: 15, pay: "Efectivo" },
      { name: "iPhone 15 Pro Max", qty: 1, price: 1450000, daysAgo: 38, pay: "Transferencia", cliente: "Sofía M." },
      { name: "AirPods (3ra gen)", qty: 1, price: 240000, daysAgo: 45, pay: "Tarjeta" },
      { name: "iPhone SE (2022)", qty: 1, price: 430000, daysAgo: 68, pay: "Efectivo", cliente: "Carlos V." },
      { name: "Funda silicona iPhone 15", qty: 4, price: 15000, daysAgo: 70, pay: "Efectivo" },
    ];

    for (const venta of ventas) {
      const productId = ids[venta.name];
      const product = await ctx.db.get(productId);
      if (!product) continue;
      const unitCost = product.costPrice;
      const newQty = Math.max(0, product.quantity - venta.qty);
      await ctx.db.patch(productId, {
        quantity: newQty,
        status: newQty > 0 ? product.status : "agotado",
        updatedAt: now,
      });
      await ctx.db.insert("transactions", {
        type: "venta",
        productId,
        productName: product.name,
        category: product.category,
        quantity: venta.qty,
        unitPrice: venta.price,
        unitCost,
        amount: venta.price * venta.qty,
        profit: (venta.price - unitCost) * venta.qty,
        paymentMethod: venta.pay,
        customerName: venta.cliente,
        date: now - venta.daysAgo * day,
        createdAt: now,
      });
    }

    // Un gasto y un ingreso de ejemplo.
    await ctx.db.insert("transactions", {
      type: "gasto", productName: "Alquiler local", amount: 180000, profit: -180000,
      notes: "Gasto fijo mensual", date: now - 10 * day, createdAt: now,
    });
    await ctx.db.insert("transactions", {
      type: "ingreso", productName: "Reparación de pantalla", amount: 45000, profit: 45000,
      paymentMethod: "Efectivo", date: now - 6 * day, createdAt: now,
    });

    // Configuración inicial de la tienda.
    const settings = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "store")).unique();
    if (!settings) {
      await ctx.db.insert("settings", {
        key: "store",
        storeName: "iPhone Store",
        whatsapp: "5491112345678",
        instagram: "iphonestore",
        currency: "ARS",
        heroTitle: "iPhone, como debe ser.",
        heroSubtitle: "Equipos nuevos y usados con garantía, y todos los accesorios. Consultá disponibilidad.",
      });
    }

    return `✅ Datos de ejemplo cargados: ${seeds.length} productos y ${ventas.length} ventas.`;
  },
});
