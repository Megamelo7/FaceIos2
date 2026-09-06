import { v, ConvexError } from "convex/values";
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

/* ───────────────────────────── Validadores ───────────────────────────── */

const categoryValidator = v.union(
  v.literal("iphone"),
  v.literal("ipad"),
  v.literal("notebook"),
  v.literal("airpods"),
  v.literal("accesorio"),
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

const imagesValidator = v.optional(v.array(v.id("_storage")));

/** Campos del artículo compartidos por create / createBatch (sin imei ni cantidad). */
const productFields = {
  name: v.string(),
  category: categoryValidator,
  brand: v.optional(v.string()),
  model: v.optional(v.string()),
  storage: v.optional(v.string()),
  color: v.optional(v.string()),
  condition: conditionValidator,
  batteryHealth: v.optional(v.number()),
  batteryType: v.optional(batteryTypeValidator),
  costPrice: v.number(),
  salePrice: v.number(),
  minStock: v.optional(v.number()),
  status: v.optional(statusValidator),
  featured: v.optional(v.boolean()),
  images: imagesValidator,
  description: v.optional(v.string()),
};

/** Datos opcionales de la compra inicial (cuando se carga desde Movimientos → Compra). */
const purchaseFields = {
  paymentMethod: v.optional(v.string()),
  purchaseDate: v.optional(v.number()),
  purchaseNotes: v.optional(v.string()),
};

/* ─────────────────────────── Reglas del IMEI ─────────────────────────── */

/** Categorías de equipos con IMEI: cada unidad es un artículo único. */
const IMEI_CATS = ["iphone", "ipad"];
export const requiresImei = (category: string) => IMEI_CATS.includes(category);

const IMEI_RE = /^\d{15}$/;

/**
 *  - iPhone / iPad: IMEI obligatorio de exactamente 15 dígitos.
 *  - Si se carga (en cualquier categoría), debe ser único en la base.
 */
async function assertImei(
  ctx: MutationCtx,
  category: string,
  imei: string | undefined,
  excludeId?: Id<"products">,
): Promise<void> {
  const value = (imei ?? "").trim();
  if (requiresImei(category)) {
    if (!IMEI_RE.test(value)) {
      throw new ConvexError("El IMEI es obligatorio y debe tener exactamente 15 dígitos.");
    }
  } else if (value === "") {
    return;
  }
  const dup = await ctx.db
    .query("products")
    .withIndex("by_imei", (q) => q.eq("imei", value))
    .first();
  if (dup && dup._id !== excludeId) {
    throw new ConvexError(`Ya existe un artículo con ese IMEI: ${dup.name}.`);
  }
}

/* ───────────────────────────── Helpers ───────────────────────────── */

/**
 * Resuelve las URLs de las fotos guardadas en Convex Storage.
 * Devuelve un array alineado con `images` ("" si alguna no existe).
 */
async function imageUrlsOf(ctx: QueryCtx | MutationCtx, p: Doc<"products">): Promise<string[]> {
  const ids = p.images ?? [];
  const urls = await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  return urls.map((u) => u ?? "");
}

/** Datos públicos de un producto: SIN precios ni datos sensibles (IMEI, costo). */
async function toPublic(ctx: QueryCtx, p: Doc<"products">) {
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
    imageUrls: (await imageUrlsOf(ctx, p)).filter(Boolean),
    description: p.description,
    featured: p.featured ?? false,
    inStock: p.quantity > 0 && p.status !== "agotado",
  };
}

type ProductInput = {
  name: string;
  category: Doc<"products">["category"];
  brand?: string;
  model?: string;
  storage?: string;
  color?: string;
  condition: Doc<"products">["condition"];
  batteryHealth?: number;
  batteryType?: Doc<"products">["batteryType"];
  costPrice: number;
  salePrice: number;
  minStock?: number;
  status?: Doc<"products">["status"];
  featured?: boolean;
  images?: Id<"_storage">[];
  description?: string;
};

type PurchaseInput = {
  paymentMethod?: string;
  purchaseDate?: number;
  purchaseNotes?: string;
};

/**
 * Inserta un artículo y registra su stock inicial como una COMPRA en
 * Movimientos: todo el stock tiene su movimiento de ingreso.
 */
async function insertProduct(
  ctx: MutationCtx,
  userId: Id<"users">,
  fields: ProductInput,
  unit: { quantity: number; imei?: string },
  purchase: PurchaseInput,
): Promise<Id<"products">> {
  const now = Date.now();
  const status = fields.status ?? (unit.quantity > 0 ? "disponible" : "agotado");
  const id = await ctx.db.insert("products", {
    ...fields,
    imei: unit.imei?.trim() || undefined,
    quantity: unit.quantity,
    status,
    createdAt: now,
    updatedAt: now,
  });
  if (unit.quantity > 0) {
    await ctx.db.insert("transactions", {
      type: "compra",
      productId: id,
      productName: fields.name,
      category: fields.category,
      quantity: unit.quantity,
      unitCost: fields.costPrice,
      amount: fields.costPrice * unit.quantity,
      paymentMethod: purchase.paymentMethod,
      notes: purchase.purchaseNotes?.trim() || "Stock inicial",
      date: purchase.purchaseDate ?? now,
      createdBy: userId,
      createdAt: now,
    });
  }
  return id;
}

/* ───────────────────────────── Queries ───────────────────────────── */

/**
 * Catálogo público para la landing. NO incluye precios ni datos sensibles.
 * Muestra sólo productos visibles (no ocultos).
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").order("desc").collect();
    return await Promise.all(
      products.filter((p) => p.status !== "oculto").map((p) => toPublic(ctx, p)),
    );
  },
});

/** Listado completo para el admin (requiere sesión), con URLs de las fotos. */
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
    return await Promise.all(
      products.map(async (p) => ({ ...p, imageUrls: await imageUrlsOf(ctx, p) })),
    );
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) return null;
    return { ...p, imageUrls: await imageUrlsOf(ctx, p) };
  },
});

/* ─────────────────────────── Fotos (storage) ─────────────────────────── */

/** URL firmada para subir un archivo a Convex Storage (requiere sesión). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Borra un archivo recién subido que no se llegó a guardar en ningún producto. */
export const deleteUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.storage.delete(args.storageId);
  },
});

/* ───────────────────────────── Mutations ───────────────────────────── */

/**
 * Alta de un artículo. iPhone / iPad: IMEI obligatorio y único, 1 unidad.
 * Resto: cantidad libre (accesorios por stock).
 */
export const create = mutation({
  args: {
    ...productFields,
    imei: v.optional(v.string()),
    quantity: v.number(),
    ...purchaseFields,
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await assertImei(ctx, args.category, args.imei);
    const { imei, quantity, paymentMethod, purchaseDate, purchaseNotes, ...fields } = args;
    return await insertProduct(
      ctx,
      userId,
      fields,
      // Un equipo con IMEI es un artículo único: siempre 1 unidad.
      { quantity: requiresImei(args.category) ? 1 : quantity, imei },
      { paymentMethod, purchaseDate, purchaseNotes },
    );
  },
});

/**
 * Alta en lote de VARIAS unidades del mismo modelo (iPhone / iPad): un
 * artículo por IMEI. Valida todos los IMEIs antes de insertar (atómico).
 */
export const createBatch = mutation({
  args: {
    ...productFields,
    imeis: v.array(v.string()),
    ...purchaseFields,
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (!requiresImei(args.category)) {
      throw new ConvexError("El alta por IMEI es sólo para iPhone / iPad.");
    }
    const imeis = args.imeis.map((s) => s.trim());
    if (imeis.length === 0) throw new ConvexError("Cargá al menos un IMEI.");
    if (new Set(imeis).size !== imeis.length) {
      throw new ConvexError("Hay IMEIs repetidos: cada unidad debe tener el suyo.");
    }
    for (const imei of imeis) await assertImei(ctx, args.category, imei);

    const { imeis: _ignored, paymentMethod, purchaseDate, purchaseNotes, ...fields } = args;
    void _ignored;
    const ids: Id<"products">[] = [];
    for (const imei of imeis) {
      ids.push(
        await insertProduct(
          ctx,
          userId,
          fields,
          { quantity: 1, imei },
          { paymentMethod, purchaseDate, purchaseNotes },
        ),
      );
    }
    return ids;
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
    // `quantity` NO se edita acá: el stock sólo cambia desde Movimientos.
    minStock: v.optional(v.number()),
    status: v.optional(statusValidator),
    featured: v.optional(v.boolean()),
    images: imagesValidator,
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...rest } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Producto no encontrado.");
    await assertImei(ctx, args.category ?? existing.category, args.imei ?? existing.imei, id);

    // Si cambió la lista de fotos, borrar del storage las que se quitaron.
    if (args.images !== undefined) {
      const keep = new Set(args.images);
      for (const oldId of existing.images ?? []) {
        if (!keep.has(oldId)) await ctx.storage.delete(oldId);
      }
    }

    // Limpiar campos undefined para no sobrescribir con undefined.
    const patch: Partial<Doc<"products">> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
    }
    if (args.imei !== undefined) patch.imei = args.imei.trim() || undefined;
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(args.id);
    // Borrar también sus fotos del storage.
    for (const imageId of existing?.images ?? []) {
      await ctx.storage.delete(imageId);
    }
    await ctx.db.delete(args.id);
  },
});
