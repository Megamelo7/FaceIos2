import { v, ConvexError } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { normalizePhone, normalizeEmail } from "./customers";
import { usedWarrantyDays, readSettings } from "./settings";
import { withProductInfo } from "./saleImei";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Equipos a los que se les registra garantía al venderlos. */
const WARRANTY_CATEGORIES = ["iphone", "ipad", "notebook", "airpods"];

/**
 * Garantía de la venta de un equipo:
 *  - nuevo → Garantía Apple sin fechas (la calcula Apple desde la activación);
 *  - usado con garantía Apple vigente a la fecha de venta → Garantía Apple
 *    hasta la fecha cargada en su ficha;
 *  - usado sin garantía Apple → de la tienda, desde la fecha de venta y por los
 *    días de Ajustes, salvo que en la venta se haya editado el vencimiento.
 * Cuando hay fechas, los días quedan guardados en la venta.
 */
async function saleWarranty(
  ctx: MutationCtx,
  product: Doc<"products">,
  date: number,
  editedEnd?: number,
) {
  if (!WARRANTY_CATEGORIES.includes(product.category)) return {};
  if (product.condition === "nuevo") return { warrantyType: "apple" as const };
  const appleEnd = product.appleWarrantyEnd;
  if (appleEnd !== undefined && appleEnd >= date) {
    return {
      warrantyType: "apple" as const,
      warrantyDays: Math.round((appleEnd - date) / DAY_MS),
      warrantyStart: date,
      warrantyEnd: appleEnd,
    };
  }
  let end = editedEnd;
  if (end === undefined) {
    const days = await usedWarrantyDays(ctx);
    if (days === undefined) {
      throw new ConvexError(
        "Configurá los días de garantía de usados en Ajustes o editá la garantía en la venta.",
      );
    }
    end = date + days * DAY_MS;
  }
  if (end < date) {
    throw new ConvexError("El vencimiento de la garantía no puede ser anterior a la fecha de venta.");
  }
  return {
    warrantyType: "tienda" as const,
    warrantyDays: Math.round((end - date) / DAY_MS),
    warrantyStart: date,
    warrantyEnd: end,
  };
}

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("No autorizado. Iniciá sesión para continuar.");
  }
  return userId;
}

/**
 * Cargado en pesos: el front ya convirtió los importes a dólares; acá se
 * guarda la cotización y el monto original en ARS (el que se tipeó; si no
 * viene, `amount` × cotización).
 */
export function fxFields(amount: number, fxRate: number | undefined, fxAmount?: number) {
  if (fxRate === undefined) return {};
  if (!(fxRate > 0)) throw new ConvexError("La cotización debe ser mayor a 0.");
  const ars = fxAmount ?? amount * fxRate;
  return { fxCurrency: "ARS", fxRate, fxAmount: Math.round(ars * 100) / 100 };
}

/** Recalcula el estado del producto según su cantidad (sin pisar "reservado"/"oculto"). */
function statusFromQuantity(
  quantity: number,
  current: "disponible" | "reservado" | "agotado" | "oculto",
): "disponible" | "reservado" | "agotado" | "oculto" {
  if (current === "oculto" || current === "reservado") return current;
  return quantity > 0 ? "disponible" : "agotado";
}

/** Listado de transacciones con filtros opcionales. */
export const list = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("venta"),
        v.literal("compra"),
        v.literal("gasto"),
        v.literal("ingreso"),
      ),
    ),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    let items = await ctx.db.query("transactions").withIndex("by_date").order("desc").collect();
    if (args.type) items = items.filter((t) => t.type === args.type);
    if (args.from !== undefined) items = items.filter((t) => t.date >= args.from!);
    if (args.to !== undefined) items = items.filter((t) => t.date <= args.to!);
    if (args.limit) items = items.slice(0, args.limit);
    return await withProductInfo(ctx, items);
  },
});

/** Un artículo de una venta. */
const saleItemFields = {
  productId: v.optional(v.id("products")),
  productName: v.optional(v.string()),
  quantity: v.number(),
  unitPrice: v.number(),
  // Monto original en ARS de este artículo (si se cargó en pesos).
  fxAmount: v.optional(v.number()),
  // Vencimiento de la garantía editado en la venta (usados); si no, sale de Ajustes.
  warrantyEnd: v.optional(v.number()),
};

/** Datos comunes a todos los artículos de una venta. */
const saleSharedFields = {
  paymentMethod: v.optional(v.string()),
  // Cliente: existente por id, o creado en el momento (nombre, teléfono, email).
  customerId: v.optional(v.id("customers")),
  newCustomer: v.optional(
    v.object({
      name: v.string(),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  ),
  customerName: v.optional(v.string()),
  customerContact: v.optional(v.string()),
  notes: v.optional(v.string()),
  date: v.optional(v.number()),
  fxRate: v.optional(v.number()),
};

type SaleItem = {
  productId?: Id<"products">;
  productName?: string;
  quantity: number;
  unitPrice: number;
  fxAmount?: number;
  warrantyEnd?: number;
};

type SaleShared = {
  paymentMethod?: string;
  customerId?: Id<"customers">;
  newCustomer?: { name: string; phone?: string; email?: string };
  customerName?: string;
  customerContact?: string;
  notes?: string;
  date?: number;
  fxRate?: number;
};

type SaleCustomer = {
  customerId?: Id<"customers">;
  customerName?: string;
  customerContact?: string;
};

/** Nombre para comparar: sin tildes, mayúsculas ni espacios de más. */
const comparableName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Resuelve el cliente: existente, o lo crea. Si el teléfono/email del nuevo ya
 * es de un cliente con el mismo nombre, usa ese; si es de otro, frena la venta.
 */
async function resolveSaleCustomer(ctx: MutationCtx, args: SaleShared): Promise<SaleCustomer> {
  let customerId = args.customerId;
  let customerName = args.customerName;
  let customerContact = args.customerContact;
  if (!customerId && args.newCustomer) {
    const name = args.newCustomer.name.trim();
    if (!name) throw new Error("El nombre del cliente es obligatorio.");
    const phone = normalizePhone(args.newCustomer.phone);
    const email = normalizeEmail(args.newCustomer.email);
    const byPhone = phone
      ? await ctx.db
          .query("customers")
          .withIndex("by_phone", (q) => q.eq("phone", phone))
          .first()
      : null;
    const byEmail =
      !byPhone && email
        ? await ctx.db
            .query("customers")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first()
        : null;
    const existing = byPhone ?? byEmail;
    if (existing) {
      // Teléfono/email únicos (como en Clientes): si es la misma persona se
      // vincula; si el nombre es otro, no se le asigna la venta en silencio.
      if (comparableName(existing.name) !== comparableName(name)) {
        const field = byPhone ? "teléfono" : "email";
        throw new ConvexError(
          `Ya existe un cliente con ese ${field}: ${existing.name}. Elegilo de la lista o cargá otro ${field}.`,
        );
      }
      customerId = existing._id;
    } else {
      customerId = await ctx.db.insert("customers", {
        name,
        phone,
        email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
  if (customerId) {
    const c = await ctx.db.get(customerId);
    if (c) {
      customerName = c.name;
      customerContact = c.phone ?? c.email ?? customerContact;
    }
  }
  return { customerId, customerName, customerContact };
}

/** Próximo N° de comprobante de venta (correlativo). */
async function nextReceiptNumber(ctx: MutationCtx): Promise<number> {
  const last = await ctx.db.query("transactions").withIndex("by_receipt").order("desc").first();
  return (last?.receiptNumber ?? 0) + 1;
}

/** Graba un artículo vendido: descuenta stock y calcula la ganancia. */
async function insertSale(
  ctx: MutationCtx,
  userId: Id<"users">,
  item: SaleItem,
  shared: SaleShared,
  customer: SaleCustomer,
  receiptNumber: number,
) {
  if (item.quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.");

  const date = shared.date ?? Date.now();
  let unitCost = 0;
  let productName = item.productName ?? "Venta";
  let productColor: string | undefined;
  let category: string | undefined;
  let imei: string | undefined;
  let warranty = {};

  if (item.productId) {
    const product = await ctx.db.get(item.productId);
    if (!product) throw new Error("Producto no encontrado.");
    if (product.quantity < item.quantity) {
      throw new Error(
        `Stock insuficiente de ${product.name}. Disponible: ${product.quantity}, solicitado: ${item.quantity}.`,
      );
    }
    warranty = await saleWarranty(ctx, product, date, item.warrantyEnd);
    unitCost = product.costPrice;
    productName = product.name;
    productColor = product.color;
    category = product.category;
    imei = product.imei;
    const newQty = product.quantity - item.quantity;
    await ctx.db.patch(item.productId, {
      quantity: newQty,
      status: statusFromQuantity(newQty, product.status),
      updatedAt: Date.now(),
    });
  }

  const amount = item.unitPrice * item.quantity;
  const profit = (item.unitPrice - unitCost) * item.quantity;

  return await ctx.db.insert("transactions", {
    type: "venta",
    productId: item.productId,
    productName,
    productColor,
    imei,
    category,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitCost,
    amount,
    profit,
    paymentMethod: shared.paymentMethod,
    ...customer,
    notes: shared.notes,
    date,
    createdBy: userId,
    createdAt: Date.now(),
    ...fxFields(amount, shared.fxRate, item.fxAmount),
    ...warranty,
    receiptNumber,
  });
}

/** Registra una VENTA de un artículo: descuenta stock y calcula la ganancia. */
export const recordSale = mutation({
  args: { ...saleItemFields, ...saleSharedFields },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const customer = await resolveSaleCustomer(ctx, args);
    return await insertSale(ctx, userId, args, args, customer, await nextReceiptNumber(ctx));
  },
});

/**
 * Registra una VENTA de varios artículos (mismo cliente, pago y fecha): un
 * movimiento por artículo. Es todo o nada: si uno falla (p. ej. sin stock),
 * no se graba ninguno.
 */
export const recordSales = mutation({
  args: { items: v.array(v.object(saleItemFields)), ...saleSharedFields },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.items.length === 0) throw new Error("Agregá al menos un artículo.");
    const { items, ...shared } = args;
    const customer = await resolveSaleCustomer(ctx, shared);
    // Un solo comprobante para todos los artículos de la venta.
    const receiptNumber = await nextReceiptNumber(ctx);
    const ids: Id<"transactions">[] = [];
    for (const item of items) {
      ids.push(await insertSale(ctx, userId, item, shared, customer, receiptNumber));
    }
    return ids;
  },
});

/**
 * Datos del comprobante de una venta: todos los artículos de la operación
 * (mismo N°), cliente, pago y los datos de la tienda (logo, contacto y
 * condiciones de garantía).
 */
export const receipt = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const tx = await ctx.db.get(args.id);
    if (!tx || tx.type !== "venta") throw new ConvexError("Venta no encontrada.");
    const sales =
      tx.receiptNumber === undefined
        ? [tx]
        : (
            await ctx.db
              .query("transactions")
              .withIndex("by_receipt", (q) => q.eq("receiptNumber", tx.receiptNumber))
              .collect()
          ).filter((t) => t.type === "venta");
    const items = await Promise.all(
      (await withProductInfo(ctx, sales)).map(async (t) => {
        const product = t.productId ? await ctx.db.get(t.productId) : null;
        return {
          _id: t._id,
          name: t.productName ?? "Artículo",
          category: t.category,
          color: t.productColor,
          storage: product?.storage,
          condition: product?.condition,
          batteryHealth: product?.batteryHealth,
          imei: t.imei,
          quantity: t.quantity ?? 1,
          unitPrice: t.unitPrice ?? t.amount,
          amount: t.amount,
          fxAmount: t.fxAmount,
          warrantyType: t.warrantyType,
          warrantyStart: t.warrantyStart,
          warrantyEnd: t.warrantyEnd,
          warrantyDays: t.warrantyDays,
        };
      }),
    );
    const store = await readSettings(ctx);
    const inArs = items.every((i) => i.fxAmount !== undefined);
    return {
      number: tx.receiptNumber ?? null,
      date: tx.date,
      customerName: tx.customerName,
      customerContact: tx.customerContact,
      paymentMethod: tx.paymentMethod,
      notes: tx.notes,
      items,
      total: items.reduce((s, i) => s + i.amount, 0),
      // Cargada en pesos: total original en ARS y cotización.
      totalArs: inArs ? items.reduce((s, i) => s + (i.fxAmount ?? 0), 0) : undefined,
      fxRate: inArs ? tx.fxRate : undefined,
      store: {
        name: store.storeName,
        address: store.address,
        whatsapp: store.whatsapp,
        email: store.email,
        instagram: store.instagram,
        currency: store.currency,
        logoUrl: store.logoUrl,
        warrantyTerms: store.warrantyTerms,
      },
    };
  },
});

/** Registra una COMPRA / reposición: suma stock y (opcional) actualiza el costo. */
export const recordPurchase = mutation({
  args: {
    productId: v.optional(v.id("products")),
    productName: v.optional(v.string()),
    quantity: v.number(),
    unitCost: v.number(),
    updateCost: v.optional(v.boolean()),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.optional(v.number()),
    fxRate: v.optional(v.number()),
    fxAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.");

    let productName = args.productName ?? "Compra";
    let productColor: string | undefined;
    let category: string | undefined;

    if (args.productId) {
      const product = await ctx.db.get(args.productId);
      if (!product) throw new Error("Producto no encontrado.");
      if (product.category === "iphone" || product.category === "ipad") {
        throw new ConvexError(
          "Los equipos con IMEI son únicos y no se reponen: cargá una Compra de producto nuevo.",
        );
      }
      productName = product.name;
      productColor = product.color;
      category = product.category;
      const newQty = product.quantity + args.quantity;
      await ctx.db.patch(args.productId, {
        quantity: newQty,
        status: statusFromQuantity(newQty, product.status),
        ...(args.updateCost ? { costPrice: args.unitCost } : {}),
        updatedAt: Date.now(),
      });
    }

    return await ctx.db.insert("transactions", {
      type: "compra",
      productId: args.productId,
      productName,
      productColor,
      category,
      quantity: args.quantity,
      unitCost: args.unitCost,
      amount: args.unitCost * args.quantity,
      paymentMethod: args.paymentMethod,
      notes: args.notes,
      date: args.date ?? Date.now(),
      createdBy: userId,
      createdAt: Date.now(),
      ...fxFields(args.unitCost * args.quantity, args.fxRate, args.fxAmount),
    });
  },
});

/** Registra un movimiento manual: GASTO o INGRESO (sin afectar stock). */
export const recordManual = mutation({
  args: {
    type: v.union(v.literal("gasto"), v.literal("ingreso")),
    amount: v.number(),
    concept: v.string(),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.optional(v.number()),
    fxRate: v.optional(v.number()),
    fxAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.amount <= 0) throw new Error("El monto debe ser mayor a 0.");
    return await ctx.db.insert("transactions", {
      type: args.type,
      productName: args.concept,
      amount: args.amount,
      profit: args.type === "ingreso" ? args.amount : -args.amount,
      paymentMethod: args.paymentMethod,
      notes: args.notes,
      date: args.date ?? Date.now(),
      createdBy: userId,
      createdAt: Date.now(),
      ...fxFields(args.amount, args.fxRate, args.fxAmount),
    });
  },
});

/** Elimina una transacción y revierte su efecto en el stock si corresponde. */
export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const tx = await ctx.db.get(args.id);
    if (!tx) return;
    if (tx.productId && tx.quantity) {
      const product = await ctx.db.get(tx.productId);
      if (product) {
        let newQty = product.quantity;
        if (tx.type === "venta") newQty += tx.quantity; // devolver stock
        if (tx.type === "compra") newQty = Math.max(0, newQty - tx.quantity);
        await ctx.db.patch(tx.productId, {
          quantity: newQty,
          status: statusFromQuantity(newQty, product.status),
          updatedAt: Date.now(),
        });
      }
    }
    await ctx.db.delete(args.id);
  },
});
