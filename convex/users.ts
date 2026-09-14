import { v, ConvexError } from "convex/values";
import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId, createAccount } from "@convex-dev/auth/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Borra las credenciales del usuario (cuenta de password). */
async function deleteAccounts(ctx: MutationCtx, userId: Id<"users">) {
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .collect();
  for (const a of accounts) await ctx.db.delete(a._id);
}

/** Cierra todas las sesiones activas del usuario y sus refresh tokens. */
async function deleteSessions(ctx: MutationCtx, userId: Id<"users">) {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  for (const s of sessions) {
    const tokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", s._id))
      .collect();
    for (const t of tokens) await ctx.db.delete(t._id);
    await ctx.db.delete(s._id);
  }
}

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
 * en cuanto hay un usuario (después, las cuentas se invitan desde Usuarios).
 */
export const bootstrap = action({
  args: { email: v.string(), name: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const empty = await ctx.runQuery(internal.users.isEmpty, {});
    if (!empty) {
      throw new ConvexError("Ya existe un administrador. Pedile que te invite.");
    }
    const email = normalizeEmail(args.email);
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

/** Datos del usuario logueado (para el saludo del panel). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { name: user.name ?? "", email: user.email ?? "" };
  },
});

/** Lista los usuarios con acceso al panel (requiere sesión). El superusuario no aparece. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (me === null) throw new ConvexError("No autorizado.");
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.isSuperuser !== true)
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "",
        email: u.email ?? "",
        createdAt: u._creationTime,
        isMe: u._id === me,
        pending: u.mustSetPassword === true,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

/**
 * Invita a un usuario: queda creado sin contraseña y la elige la primera vez
 * que ingresa con su mail (ver `setInitialPassword`).
 */
export const invite = mutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (me === null) throw new ConvexError("No autorizado.");

    const email = normalizeEmail(args.email);
    const name = args.name.trim();
    if (!email || !email.includes("@")) throw new ConvexError("Ingresá un email válido.");
    if (!name) throw new ConvexError("El nombre es obligatorio.");

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new ConvexError("Ya existe un usuario con ese email.");

    // `emailVerificationTime` permite que `createAccount` vincule la
    // contraseña a este usuario (por email) en vez de crear otro.
    await ctx.db.insert("users", {
      email,
      name,
      emailVerificationTime: Date.now(),
      mustSetPassword: true,
    });
  },
});

/** Público (login): ¿este email tiene que crear su contraseña? */
export const needsPasswordSetup = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizeEmail(args.email)))
      .first();
    return user?.mustSetPassword === true;
  },
});

/** Primer ingreso de un invitado (o tras blanquear): crea su contraseña. */
export const setInitialPassword = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const email = normalizeEmail(args.email);
    if (args.password.length < 8) {
      throw new ConvexError("La contraseña debe tener al menos 8 caracteres.");
    }
    const user = await ctx.runQuery(internal.users.findByEmail, { email });
    if (!user || user.mustSetPassword !== true) {
      throw new ConvexError("Este email no tiene que crear contraseña.");
    }

    const created = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: { email, name: user.name ?? "" },
      shouldLinkViaEmail: true,
    });
    await ctx.runMutation(internal.users.finishPasswordSetup, {
      userId: user._id,
      createdUserId: created.user._id,
    });
    return null;
  },
});

/** Marca la contraseña como creada (y deshace un alta duplicada si no se vinculó). */
export const finishPasswordSetup = internalMutation({
  args: { userId: v.id("users"), createdUserId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.createdUserId !== args.userId) {
      await deleteAccounts(ctx, args.createdUserId);
      await deleteSessions(ctx, args.createdUserId);
      await ctx.db.delete(args.createdUserId);
      throw new ConvexError("No se pudo crear la contraseña. Pedile al administrador que te invite de nuevo.");
    }
    await ctx.db.patch(args.userId, { mustSetPassword: undefined });
  },
});

/**
 * Blanquea la clave: borra la contraseña, cierra sus sesiones y la próxima vez
 * que ingrese con su mail crea una nueva.
 */
export const resetPassword = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (me === null) throw new ConvexError("No autorizado.");
    if (me === args.userId) throw new ConvexError("No podés blanquear tu propia clave.");

    const user = await ctx.db.get(args.userId);
    if (!user || user.isSuperuser === true) throw new ConvexError("Usuario no encontrado.");

    await deleteAccounts(ctx, args.userId);
    await deleteSessions(ctx, args.userId);
    await ctx.db.patch(args.userId, {
      mustSetPassword: true,
      emailVerificationTime: user.emailVerificationTime ?? Date.now(),
    });
  },
});

/** Elimina un usuario y cierra todas sus sesiones. No permite auto-eliminarse ni borrar al superusuario. */
export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getAuthUserId(ctx);
    if (me === null) throw new ConvexError("No autorizado.");
    if (me === args.userId) throw new ConvexError("No podés eliminar tu propio usuario.");

    const user = await ctx.db.get(args.userId);
    if (!user || user.isSuperuser === true) throw new ConvexError("Usuario no encontrado.");

    await deleteAccounts(ctx, args.userId);
    await deleteSessions(ctx, args.userId);
    await ctx.db.delete(args.userId);
  },
});

/**
 * Marca (o desmarca) al superusuario. Sólo por CLI, nunca desde el panel:
 *   npx convex run users:setSuperuser '{"email":"tu@mail.com"}'
 *   npx convex run users:setSuperuser '{"email":"tu@mail.com","value":false}'
 */
export const setSuperuser = internalMutation({
  args: { email: v.string(), value: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new ConvexError(`No existe un usuario con el email ${email}.`);
    await ctx.db.patch(user._id, { isSuperuser: args.value === false ? undefined : true });
    return user._id;
  },
});
