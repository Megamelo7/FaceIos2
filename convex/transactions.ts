import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { normalizePhone, normalizeEmail } from "./customers";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("No autorizado. Iniciá sesión para continuar.");
  }
  return userId;
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
    return items;
  },
});

/** Registra una VENTA: descuenta stock y calcula la ganancia. */
export const recordSale = mutation({
  args: {
    productId: v.optional(v.id("products")),
    productName: v.optional(v.string()),
    quantity: v.number(),
    unitPrice: v.number(),
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
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.");

    let unitCost = 0;
    let productName = args.productName ?? "Venta";
    let category: string | undefined;

    if (args.productId) {
      const product = await ctx.db.get(args.productId);
      if (!product) throw new Error("Producto no encontrado.");
      if (product.quantity < args.quantity) {
        throw new Error(
          `Stock insuficiente. Disponible: ${product.quantity}, solicitado: ${args.quantity}.`,
        );
      }
      unitCost = product.costPrice;
      productName = product.name;
      category = product.category;
      const newQty = product.quantity - args.quantity;
      await ctx.db.patch(args.productId, {
        quantity: newQty,
        status: statusFromQuantity(newQty, product.status),
        updatedAt: Date.now(),
      });
    }

    // Resolver el cliente: existente, o crearlo (reutiliza si el teléfono ya existe).
    let customerId = args.customerId;
    let customerName = args.customerName;
    let customerContact = args.customerContact;
    if (!customerId && args.newCustomer) {
      const name = args.newCustomer.name.trim();
      if (!name) throw new Error("El nombre del cliente es obligatorio.");
      const phone = normalizePhone(args.newCustomer.phone);
      const email = normalizeEmail(args.newCustomer.email);
      const existing = phone
        ? await ctx.db
            .query("customers")
            .withIndex("by_phone", (q) => q.eq("phone", phone))
            .first()
        : null;
      customerId = existing
        ? existing._id
        : await ctx.db.insert("customers", {
            name,
            phone,
            email,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
    }
    if (customerId) {
      const c = await ctx.db.get(customerId);
      if (c) {
        customerName = c.name;
        customerContact = c.phone ?? c.email ?? customerContact;
      }
    }

    const amount = args.unitPrice * args.quantity;
    const profit = (args.unitPrice - unitCost) * args.quantity;

    return await ctx.db.insert("transactions", {
      type: "venta",
      productId: args.productId,
      productName,
      category,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      unitCost,
      amount,
      profit,
      paymentMethod: args.paymentMethod,
      customerId,
      customerName,
      customerContact,
      notes: args.notes,
      date: args.date ?? Date.now(),
      createdBy: userId,
      createdAt: Date.now(),
    });
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
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.");

    let productName = args.productName ?? "Compra";
    let category: string | undefined;

    if (args.productId) {
      const product = await ctx.db.get(args.productId);
      if (!product) throw new Error("Producto no encontrado.");
      productName = product.name;
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
      category,
      quantity: args.quantity,
      unitCost: args.unitCost,
      amount: args.unitCost * args.quantity,
      paymentMethod: args.paymentMethod,
      notes: args.notes,
      date: args.date ?? Date.now(),
      createdBy: userId,
      createdAt: Date.now(),
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
