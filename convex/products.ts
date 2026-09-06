import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("No autorizado. Iniciá sesión para continuar.");
  }
  return userId;
}

const categoryValidator = v.union(
  v.literal("iphone"),
  v.literal("accesorio"),
  v.literal("airpods"),
  v.literal("otro"),
);

const conditionValidator = v.union(
  v.literal("nuevo"),
  v.literal("usado"),
  v.literal("reacondicionado"),
);

const statusValidator = v.union(
  v.literal("disponible"),
  v.literal("reservado"),
  v.literal("agotado"),
  v.literal("oculto"),
);

const batteryTypeValidator = v.union(
  v.literal("original"),
  v.literal("reacondicionada"),
);

/** Datos públicos de un producto: SIN precios ni datos sensibles (IMEI, costo). */
function toPublic(p: Doc<"products">) {
  return {
    _id: p._id,
    name: p.name,
    category: p.category,
    brand: p.brand,
    model: p.model,
    storage: p.storage,
    color: p.color,
    condition: p.condition,
    batteryHealth: p.batteryHealth,
    batteryType: p.batteryType,
    imageUrl: p.imageUrl,
    description: p.description,
    featured: p.featured ?? false,
    inStock: p.quantity > 0 && p.status !== "agotado",
  };
}

/**
 * Catálogo público para la landing. NO incluye precios ni datos sensibles.
 * Muestra sólo productos visibles (no ocultos).
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").order("desc").collect();
    return products
      .filter((p) => p.status !== "oculto")
      .map(toPublic);
  },
});

/** Listado completo para el admin (requiere sesión). */
export const list = query({
  args: {
    category: v.optional(categoryValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    let products: Doc<"products">[];
    if (args.category) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .collect();
    } else {
      products = await ctx.db.query("products").order("desc").collect();
    }
    const search = args.search?.trim().toLowerCase();
    if (search) {
      products = products.filter((p) =>
        [p.name, p.model, p.brand, p.color, p.imei]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(search)),
      );
    }
    return products;
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: categoryValidator,
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    storage: v.optional(v.string()),
    color: v.optional(v.string()),
    condition: conditionValidator,
    batteryHealth: v.optional(v.number()),
    batteryType: v.optional(batteryTypeValidator),
    imei: v.optional(v.string()),
    costPrice: v.number(),
    salePrice: v.number(),
    quantity: v.number(),
    minStock: v.optional(v.number()),
    status: v.optional(statusValidator),
    featured: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    const status = args.status ?? (args.quantity > 0 ? "disponible" : "agotado");
    return await ctx.db.insert("products", {
      ...args,
      status,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    category: v.optional(categoryValidator),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    storage: v.optional(v.string()),
    color: v.optional(v.string()),
    condition: v.optional(conditionValidator),
    batteryHealth: v.optional(v.number()),
    batteryType: v.optional(batteryTypeValidator),
    imei: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    quantity: v.optional(v.number()),
    minStock: v.optional(v.number()),
    status: v.optional(statusValidator),
    featured: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...rest } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Producto no encontrado.");
    // Limpiar campos undefined para no sobrescribir con undefined.
    const patch: Partial<Doc<"products">> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
  },
});
