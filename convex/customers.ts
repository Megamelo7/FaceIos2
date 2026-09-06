import { v, ConvexError } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

/** Normaliza un teléfono: quita espacios, guiones y paréntesis (conserva el +). */
export function normalizePhone(p?: string): string | undefined {
  if (!p) return undefined;
  const s = p.trim().replace(/[\s().-]/g, "");
  return s ? s : undefined;
}

export function normalizeEmail(e?: string): string | undefined {
  const s = (e ?? "").trim().toLowerCase();
  return s ? s : undefined;
}

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("No autorizado.");
}

const matches = (c: Doc<"customers">, q: string) =>
  [c.name, c.phone, c.email].filter(Boolean).some((f) => f!.toLowerCase().includes(q));

/** Búsqueda rápida para el selector de cliente al registrar una venta. */
export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const q = args.q.trim().toLowerCase();
    const all = await ctx.db.query("customers").order("desc").collect();
    const hits = q ? all.filter((c) => matches(c, q)) : all;
    return hits
      .slice(0, 8)
      .map((c) => ({ _id: c._id, name: c.name, phone: c.phone, email: c.email }));
  },
});

/** Listado de clientes con resumen de compras. */
export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const q = args.search?.trim().toLowerCase();
    let customers = await ctx.db.query("customers").order("desc").collect();
    if (q) customers = customers.filter((c) => matches(c, q));

    const sales = await ctx.db
      .query("transactions")
      .withIndex("by_type", (qq) => qq.eq("type", "venta"))
      .collect();
    const agg = new Map<string, { count: number; total: number; last: number }>();
    for (const s of sales) {
      if (!s.customerId) continue;
      const a = agg.get(s.customerId) ?? { count: 0, total: 0, last: 0 };
      a.count += 1;
      a.total += s.amount;
      a.last = Math.max(a.last, s.date);
      agg.set(s.customerId, a);
    }
    return customers.map((c) => ({
      ...c,
      ...(agg.get(c._id) ?? { count: 0, total: 0, last: 0 }),
    }));
  },
});

/** Detalle de un cliente con su historial de ventas. */
export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const customer = await ctx.db.get(args.id);
    if (!customer) return null;
    const sales = await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .order("desc")
      .collect();
    return { customer, sales };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("El nombre es obligatorio.");
    const phone = normalizePhone(args.phone);
    const email = normalizeEmail(args.email);
    if (phone) {
      const dup = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first();
      if (dup) throw new ConvexError(`Ya existe un cliente con ese teléfono: ${dup.name}.`);
    }
    if (email) {
      const dup = await ctx.db
        .query("customers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (dup) throw new ConvexError(`Ya existe un cliente con ese email: ${dup.name}.`);
    }
    const now = Date.now();
    return await ctx.db.insert("customers", {
      name,
      phone,
      email,
      notes: args.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Cliente no encontrado.");
    const patch: Partial<Doc<"customers">> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new ConvexError("El nombre es obligatorio.");
      patch.name = name;
    }
    if (args.phone !== undefined) {
      const phone = normalizePhone(args.phone);
      if (phone) {
        const dup = await ctx.db
          .query("customers")
          .withIndex("by_phone", (q) => q.eq("phone", phone))
          .first();
        if (dup && dup._id !== args.id) {
          throw new ConvexError(`Ya existe un cliente con ese teléfono: ${dup.name}.`);
        }
      }
      patch.phone = phone;
    }
    if (args.email !== undefined) {
      const email = normalizeEmail(args.email);
      if (email) {
        const dup = await ctx.db
          .query("customers")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first();
        if (dup && dup._id !== args.id) {
          throw new ConvexError(`Ya existe un cliente con ese email: ${dup.name}.`);
        }
      }
      patch.email = email;
    }
    if (args.notes !== undefined) patch.notes = args.notes.trim() || undefined;
    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

/** Elimina el cliente; sus ventas conservan el nombre como snapshot. */
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const sales = await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .collect();
    for (const s of sales) await ctx.db.patch(s._id, { customerId: undefined });
    await ctx.db.delete(args.id);
  },
});
