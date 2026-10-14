import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";
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
 * Modelos del catálogo oficial de Apple que faltan cargar: todos si el
 * catálogo está vacío; si no, sólo los lanzamientos posteriores al último que
 * tenga cada categoría (no revive los que se borraron ni toca los editados).
 */
/** Identifica un modelo del catálogo oficial (el front usa la misma clave). */
const catalogKey = (e: { category: string; name: string }) => `${e.category}|${e.name}`;

function pendingOfficial(existing: Doc<"deviceModels">[]) {
  if (existing.length === 0) return { full: true, items: APPLE_CATALOG };
  const key = catalogKey;
  const present = new Set(existing.map(key));
  const lastIdx = new Map<string, number>();
  APPLE_CATALOG.forEach((e, i) => {
    if (present.has(key(e))) lastIdx.set(e.category, i);
  });
  const items = APPLE_CATALOG.filter((e, i) => {
    const last = lastIdx.get(e.category);
    return last !== undefined && i > last && !present.has(key(e));
  });
  return { full: false, items };
}

/**
 * Graba los modelos que faltan (o sólo los de `only`, las claves que quedaron
 * en la vista previa) y devuelve el mensaje para mostrar.
 */
async function insertPending(ctx: MutationCtx, only?: string[]): Promise<string> {
  const existing = await ctx.db.query("deviceModels").collect();
  const { full, items: pending } = pendingOfficial(existing);
  if (pending.length === 0) return "El catálogo ya está al día.";
  const picked = only ? new Set(only) : null;
  const items = picked ? pending.filter((e) => picked.has(catalogKey(e))) : pending;
  if (items.length === 0) return "No se agregó ningún modelo.";
  let order = existing.reduce((m, d) => Math.max(m, d.order ?? 0), -1);
  const now = Date.now();
  for (const entry of items) {
    await ctx.db.insert("deviceModels", { ...entry, order: ++order, createdAt: now });
  }
  return full
    ? `✅ Catálogo Apple cargado: ${items.length} modelos.`
    : `✅ Modelos nuevos agregados: ${items.map((e) => e.name).join(", ")}.`;
}

/** Vista previa de lo que va a crear `seed` (botón del panel). */
export const previewSeed = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return pendingOfficial(await ctx.db.query("deviceModels").collect());
  },
});

/** Carga desde el panel (con la vista previa ya aceptada) los modelos oficiales que faltan. */
export const seed = mutation({
  // Claves "categoría|nombre" que quedaron en la vista previa (sin las que se quitaron).
  args: { only: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await insertPending(ctx, args.only);
  },
});

/**
 * Lo mismo por CLI (sin login). Con `force: true` borra el catálogo y lo
 * recarga entero (se pierden los modelos editados o agregados a mano).
 *   npx convex run catalog:seedCli
 *   npx convex run catalog:seedCli '{"force": true}' --prod
 */
export const seedCli = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.force) {
      for (const d of await ctx.db.query("deviceModels").collect()) await ctx.db.delete(d._id);
    }
    return await insertPending(ctx);
  },
});
