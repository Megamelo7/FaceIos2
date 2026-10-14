import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Día en hora argentina (UTC−3, sin horario de verano).
const localDay = (ts: number) => new Date(ts - 3 * 3_600_000).toISOString().slice(0, 10);

/**
 * Agrupa las ventas sin N° de comprobante en comprobantes, en orden
 * cronológico (fecha de venta y orden de carga): las del mismo cliente en el
 * mismo día comparten uno. Numera a partir de `last + 1`.
 */
export function planReceiptNumbers(sales: Doc<"transactions">[], last: number) {
  const pending = sales
    .filter((t) => t.type === "venta" && t.receiptNumber === undefined)
    .sort((a, b) => a.date - b.date || a._creationTime - b._creationTime);
  const groups = new Map<string, Doc<"transactions">[]>();
  for (const t of pending) {
    const who = t.customerId ?? (t.customerName?.trim().toLowerCase() || `sin-cliente:${t._id}`);
    const key = `${localDay(t.date)}|${who}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.values()].map((items, i) => ({ number: last + 1 + i, items }));
}

/**
 * Numera los comprobantes de las ventas anteriores al N° (SÓLO por CLI), con
 * `planReceiptNumbers`. Nunca cambia números ya asignados: sigue después del
 * último. Sin `apply: true` sólo devuelve el plan.
 *   npx convex run maintenance:numberOldReceipts --prod '{}'
 *   npx convex run maintenance:numberOldReceipts --prod '{"apply": true}'
 */
export const numberOldReceipts = internalMutation({
  args: { apply: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const sales = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("type", "venta"))
      .collect();
    const last = sales.reduce((m, t) => Math.max(m, t.receiptNumber ?? 0), 0);
    const plan = planReceiptNumbers(sales, last);
    if (args.apply) {
      for (const { number, items } of plan) {
        for (const t of items) await ctx.db.patch(t._id, { receiptNumber: number });
      }
    }
    return {
      aplicado: !!args.apply,
      comprobantes: plan.length,
      plan: plan.map(({ number, items }) => ({
        numero: String(number).padStart(6, "0"),
        dia: localDay(items[0].date),
        cliente: items[0].customerName ?? "(sin cliente)",
        articulos: items.map((t) => t.productName ?? "Artículo"),
      })),
    };
  },
});

/**
 * Limpieza de datos (SÓLO por CLI; no es accesible desde la web).
 *
 * Borra TODO lo grabado por la operación del negocio (y los archivos sueltos
 * del storage que no usa nadie) y conserva:
 *   - usuarios y sesiones (tablas de auth),
 *   - el catálogo de modelos (deviceModels), salvo `resetCatalog: true`
 *     (se recarga con "Cargar catálogo Apple"),
 *   - la configuración de la tienda (settings), salvo `resetSettings: true`.
 *
 *   npx convex run maintenance:resetData --prod '{}'
 *   npx convex run maintenance:resetData --prod '{"resetCatalog": true}'
 *   npx convex run maintenance:resetData --prod '{"resetSettings": true}'
 */
export const resetData = internalMutation({
  args: { resetSettings: v.optional(v.boolean()), resetCatalog: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const counts = {
      products: 0,
      images: 0,
      transactions: 0,
      customers: 0,
      catalog: 0,
      settings: 0,
      orphanFiles: 0,
    };

    // Productos + sus fotos en storage.
    for (const p of await ctx.db.query("products").collect()) {
      for (const imageId of p.images ?? []) {
        await ctx.storage.delete(imageId);
        counts.images++;
      }
      await ctx.db.delete(p._id);
      counts.products++;
    }

    for (const t of await ctx.db.query("transactions").collect()) {
      await ctx.db.delete(t._id);
      counts.transactions++;
    }

    for (const c of await ctx.db.query("customers").collect()) {
      await ctx.db.delete(c._id);
      counts.customers++;
    }

    if (args.resetCatalog) {
      for (const m of await ctx.db.query("deviceModels").collect()) {
        await ctx.db.delete(m._id);
        counts.catalog++;
      }
    }

    if (args.resetSettings) {
      for (const s of await ctx.db.query("settings").collect()) {
        if (s.logoId) await ctx.storage.delete(s.logoId);
        await ctx.db.delete(s._id);
        counts.settings++;
      }
    }

    // Archivos que ya no usa nadie (p. ej. fotos subidas y nunca guardadas):
    // sólo se conserva el logo de la tienda.
    const keep = new Set(
      (await ctx.db.query("settings").collect()).flatMap((s) => (s.logoId ? [s.logoId] : [])),
    );
    for (const file of await ctx.db.system.query("_storage").collect()) {
      if (!keep.has(file._id)) {
        await ctx.storage.delete(file._id);
        counts.orphanFiles++;
      }
    }

    const models = (await ctx.db.query("deviceModels").collect()).length;
    const users = (await ctx.db.query("users").collect()).length;
    return {
      borrado: counts,
      conservado: { usuarios: users, modelos: models, settings: !args.resetSettings },
    };
  },
});
