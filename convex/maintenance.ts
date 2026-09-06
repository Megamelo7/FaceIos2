import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Limpieza de datos (SÓLO por CLI; no es accesible desde la web).
 *
 * Borra TODO lo grabado por la operación del negocio y conserva:
 *   - usuarios y sesiones (tablas de auth),
 *   - el catálogo de modelos (deviceModels),
 *   - la configuración de la tienda (settings), salvo `resetSettings: true`.
 *
 *   npx convex run maintenance:resetData --prod '{}'
 *   npx convex run maintenance:resetData --prod '{"resetSettings": true}'
 */
export const resetData = internalMutation({
  args: { resetSettings: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const counts = { products: 0, images: 0, transactions: 0, customers: 0, settings: 0 };

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

    if (args.resetSettings) {
      for (const s of await ctx.db.query("settings").collect()) {
        await ctx.db.delete(s._id);
        counts.settings++;
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
