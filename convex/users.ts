import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId, createAccount } from "@convex-dev/auth/server";

/** Busca un usuario por email (uso interno). */
export const findByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

/** ¿Hay cero usuarios? (uso interno) */
export const isEmpty = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("users").take(1)).length === 0,
});

/**
 * Público: indica si el sistema aún no tiene ningún usuario (primer arranque).
 * Sólo en ese caso el login ofrece crear la cuenta admin inicial.
 */
export const needsBootstrap = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("users").take(1)).length === 0,
});

/**
 * Crea el PRIMER admin cuando no existe ningún usuario. Se deshabilita solo
 * en cuanto hay un usuario (después, las cuentas se crean desde Usuarios).
 */
export const bootstrap = action({
  args: { email: v.string(), name: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const empty = await ctx.runQuery(internal.users.isEmpty, {});
    if (!empty) {
      throw new ConvexError("Ya existe un administrador. Pedile que cree tu usuario.");
    }
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    if (!email || !email.includes("@")) throw new ConvexError("Ingresá un email válido.");
    if (!name) throw new ConvexError("El nombre es obligatorio.");
    if (args.password.length < 8) {
      throw new ConvexError("La contraseña debe tener al menos 8 caracteres.");
    }
    await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: { email, name },
    });
    return null;
  },
});

/** Lista los usuarios con acceso al panel (requiere sesión). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (me === null) throw new ConvexError("No autorizado.");
    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "",
        email: u.email ?? "",
        createdAt: u._creationTime,
        isMe: u._id === me,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

/**
 * Crea un usuario nuevo con email + nombre + contraseña.
 * Sólo puede hacerlo un admin logueado y NO afecta su sesión actual
 * (a diferencia del flow "signUp", que loguearía al usuario nuevo).
 */
export const create = action({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const me = await getAuthUserId(ctx);
    if (me === null) throw new ConvexError("No autorizado.");

    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    if (!email || !email.includes("@")) throw new ConvexError("Ingresá un email válido.");
    if (!name) throw new ConvexError("El nombre es obligatorio.");
    if (args.password.length < 8) {
      throw new ConvexError("La contraseña debe tener al menos 8 caracteres.");
    }

    const existing = await ctx.runQuery(internal.users.findByEmail, { email });
    if (existing) throw new ConvexError("Ya existe un usuario con ese email.");

    await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: { email, name },
    });
    return null;
  },
});

/** Elimina un usuario y cierra todas sus sesiones. No permite auto-eliminarse. */
export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (me === null) throw new ConvexError("No autorizado.");
    if (me === args.userId) throw new ConvexError("No podés eliminar tu propio usuario.");

    // Cuentas (credenciales) del usuario.
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const a of accounts) await ctx.db.delete(a._id);

    // Sesiones activas y sus refresh tokens.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", s._id))
        .collect();
      for (const t of tokens) await ctx.db.delete(t._id);
      await ctx.db.delete(s._id);
    }

    await ctx.db.delete(args.userId);
  },
});
