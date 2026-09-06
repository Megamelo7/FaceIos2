import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

/**
 * Autenticación por email + contraseña para el panel de administración.
 *
 * Control de acceso:
 *   - Si la variable de entorno ADMIN_EMAILS está definida (lista separada por
 *     comas), sólo esos emails pueden crear una cuenta.
 *   - Si NO está definida, se permite el registro (útil para crear el primer
 *     admin). Una vez creado, definí ADMIN_EMAILS para cerrar el registro:
 *       npx convex env set ADMIN_EMAILS "tu@email.com"
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const AdminPassword = Password({
  profile(params) {
    const email = String(params.email ?? "")
      .toLowerCase()
      .trim();
    if (!email) {
      throw new ConvexError("El email es obligatorio.");
    }
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
      throw new ConvexError("Este email no está autorizado.");
    }
    const name =
      typeof params.name === "string" && params.name.trim()
        ? params.name.trim()
        : email.split("@")[0];
    return { email, name };
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
