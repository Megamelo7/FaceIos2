import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

/**
 * Autenticación por email + contraseña para el panel de administración.
 *
 * El registro público está DESHABILITADO: nadie puede crearse una cuenta
 * desde el login. Los usuarios se crean únicamente desde el panel, por un
 * admin ya logueado (ver `convex/users.ts`, que usa `createAccount`).
 */
const AdminPassword = Password({
  profile(params) {
    // `profile` corre en todos los flows (signIn, signUp, reset...).
    // Bloqueamos únicamente el alta pública; el login sigue funcionando.
    if (params.flow === "signUp") {
      throw new ConvexError(
        "El registro está deshabilitado. Pedile al administrador que cree tu usuario.",
      );
    }
    const email = String(params.email ?? "")
      .toLowerCase()
      .trim();
    if (!email) {
      throw new ConvexError("El email es obligatorio.");
    }
    return { email };
  },
  validatePasswordRequirements(password: string) {
    if (password.length < 8) {
      throw new ConvexError("La contraseña debe tener al menos 8 caracteres.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [AdminPassword],
});
