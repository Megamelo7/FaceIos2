import { v, ConvexError } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { APPLE_CATALOG } from "./catalogData";

/**
 * Catálogo de modelos (configuración): modelo + colores + capacidades.
 * Alimenta los combos del alta de artículo. Editable desde el panel.
 */

const catalogCategory = v.union(
  v.literal("iphone"),
  v.literal("ipad"),
  v.literal("notebook"),
  v.literal("airpods"),
);

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("No autorizado.");
}

const clean = (arr: string[]) =>
  Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));

/** Lista los modelos (más nuevos primero), opcionalmente por categoría. */
export const list = query({
  args: { category: v.optional(catalogCategory) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const items = args.category
      ? await ctx.db
          .query("deviceModels")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .collect()
      : await ctx.db.query("deviceModels").collect();
    return items.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
  },
});

export const create = mutation({
  args: {
    category: catalogCategory,
    name: v.string(),
    colors: v.array(v.string()),
    storages: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("El nombre del modelo es obligatorio.");
    const all = await ctx.db.query("deviceModels").collect();
    const maxOrder = all.reduce((m, d) => Math.max(m, d.order ?? 0), 0);
    return await ctx.db.insert("deviceModels", {
      category: args.category,
      name,
      colors: clean(args.colors),
      storages: clean(args.storages),
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("deviceModels"),
    category: v.optional(catalogCategory),
    name: v.optional(v.string()),
    colors: v.optional(v.array(v.string())),
    storages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...rest } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("Modelo no encontrado.");
    const patch: Record<string, unknown> = {};
    if (rest.category !== undefined) patch.category = rest.category;
    if (rest.name !== undefined) {
      const name = rest.name.trim();
      if (!name) throw new ConvexError("El nombre del modelo es obligatorio.");
      patch.name = name;
    }
    if (rest.colors !== undefined) patch.colors = clean(rest.colors);
    if (rest.storages !== undefined) patch.storages = clean(rest.storages);
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("deviceModels") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * Carga el catálogo oficial de Apple. Idempotente: no hace nada si ya hay
 * modelos, salvo con `force: true` (borra y recarga).
 *   npx convex run catalog:seed
 *   npx convex run catalog:seed --prod
 */
export const seed = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("deviceModels").take(1);
    if (existing.length > 0 && !args.force) {
      return "El catálogo ya tiene modelos. Usá {\"force\": true} para recargar.";
    }
    if (args.force) {
      for (const d of await ctx.db.query("deviceModels").collect()) await ctx.db.delete(d._id);
    }
    const now = Date.now();
    let i = 0;
    for (const entry of APPLE_CATALOG) {
      await ctx.db.insert("deviceModels", {
        ...entry,
        order: i++,
        createdAt: now,
      });
    }
    return `✅ Catálogo Apple cargado: ${APPLE_CATALOG.length} modelos.`;
  },
});
