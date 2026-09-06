import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const KEY = "store";

const DEFAULTS = {
  storeName: "iPhone Store",
  whatsapp: "5490000000000",
  email: "",
  address: "",
  instagram: "",
  currency: "ARS",
  heroTitle: "iPhone, como debe ser.",
  heroSubtitle:
    "Equipos nuevos y usados, con garantía y los mejores accesorios. Consultá disponibilidad y precio.",
};

/** Configuración pública de la tienda (para la landing). */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    return { ...DEFAULTS, ...(doc ?? {}) };
  },
});

/** Actualiza la configuración (requiere sesión). */
export const update = mutation({
  args: {
    storeName: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    instagram: v.optional(v.string()),
    currency: v.optional(v.string()),
    heroTitle: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("No autorizado.");
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("settings", { key: KEY, ...args });
  },
});

async function requireAuthCtx(ctx: QueryCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("No autorizado.");
}

/** Versión completa de la config para el admin (misma data, pero sólo con sesión). */
export const getAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthCtx(ctx);
    const doc = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    return { ...DEFAULTS, ...(doc ?? {}) };
  },
});
