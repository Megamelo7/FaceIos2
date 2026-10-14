import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const KEY = "store";

const DEFAULTS = {
  storeName: "FaceIos2",
  whatsapp: "https://wa.me/qr/VCBMWO6HPZ23B1",
  email: "",
  address: "",
  instagram: "faceios2",
  currency: "ARS",
  heroTitle: "iPhone, como debe ser.",
  heroSubtitle:
    "Equipos nuevos y usados, con garantía y los mejores accesorios. Consultá disponibilidad y precio.",
};

/** Config guardada + la URL del logo resuelta desde el storage. */
export async function readSettings(ctx: QueryCtx) {
  const doc = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", KEY))
    .unique();
  const logoUrl = doc?.logoId ? await ctx.storage.getUrl(doc.logoId) : null;
  return { ...DEFAULTS, ...(doc ?? {}), logoUrl: logoUrl ?? "" };
}

/** Días de garantía de los equipos usados (Ajustes → Garantías), si están configurados. */
export async function usedWarrantyDays(ctx: QueryCtx): Promise<number | undefined> {
  const doc = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", KEY))
    .unique();
  return doc?.warrantyDays;
}

/** Configuración pública de la tienda (para la landing). */
export const get = query({
  args: {},
  handler: async (ctx) => readSettings(ctx),
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
    // Condiciones de garantía del comprobante de venta.
    warrantyTerms: v.optional(v.string()),
    // Garantía de usados en días; `null` la deja sin configurar.
    warrantyDays: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { warrantyDays, ...args }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("No autorizado.");
    if (warrantyDays != null && !(Number.isInteger(warrantyDays) && warrantyDays >= 0)) {
      throw new ConvexError("Los días de garantía tienen que ser un número entero.");
    }
    const data =
      warrantyDays === undefined ? args : { ...args, warrantyDays: warrantyDays ?? undefined };
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("settings", { key: KEY, ...data });
  },
});

/**
 * Versión del sistema que muestra el menú del panel. No se edita desde el
 * panel: sólo desde Convex (CLI o dashboard). Dev usa la serie 1.2.x y
 * producción la 1.5.x.
 *   npx convex run settings:setVersion '{"version":"1.2.5"}'          (dev)
 *   npx convex run settings:setVersion '{"version":"1.5.5"}' --prod   (producción)
 */
export const setVersion = internalMutation({
  args: { version: v.string() },
  handler: async (ctx, args) => {
    const appVersion = args.version.trim() || undefined;
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { appVersion });
      return existing._id;
    }
    return await ctx.db.insert("settings", { key: KEY, appVersion });
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
    return await readSettings(ctx);
  },
});

/** URL para subir el logo de la organización a Convex Storage. */
export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("No autorizado.");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Guarda (o quita, con `null`) el logo de la organización.
 * El archivo anterior se borra del storage para no dejar huérfanos.
 */
export const setLogo = mutation({
  args: { storageId: v.union(v.id("_storage"), v.null()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("No autorizado.");
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();

    const previous = existing?.logoId;
    if (existing) {
      await ctx.db.patch(existing._id, { logoId: args.storageId ?? undefined });
    } else if (args.storageId) {
      await ctx.db.insert("settings", { key: KEY, logoId: args.storageId });
    }
    if (previous && previous !== args.storageId) {
      await ctx.storage.delete(previous);
    }
  },
});
