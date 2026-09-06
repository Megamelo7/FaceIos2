import { useState, FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery, useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Field } from "../components/ui";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  // true sólo cuando el sistema no tiene ningún usuario (primer arranque).
  const needsBootstrap = useQuery(api.users.needsBootstrap) === true;
  const bootstrap = useAction(api.users.bootstrap);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) return <Navigate to="/admin" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (needsBootstrap) {
        // Primer admin: se crea la cuenta y luego se inicia sesión con ella.
        await bootstrap({ email, name, password });
      }
      await signIn("password", { email, password, flow: "signIn" });
      // Al autenticarse, el router redirige a /admin automáticamente.
    } catch (err) {
      setError(
        err instanceof ConvexError
          ? String(err.data)
          : needsBootstrap
            ? "No se pudo crear la cuenta."
            : "Email o contraseña incorrectos.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-100">
      {/* Panel de marca */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-950 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px circle at 20% 20%, rgba(99,102,241,.35), transparent 60%), radial-gradient(500px circle at 80% 70%, rgba(139,92,246,.25), transparent 55%)",
          }}
        />
        <Link to="/" className="relative inline-flex w-fit rounded-2xl bg-white px-4 py-2.5 shadow-card-lg">
          <img src="/logo.png" alt="FaceIos2" className="h-12 w-auto" />
        </Link>
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight">Panel de gestión</h1>
          <p className="mt-3 max-w-sm text-ink-400">
            Controlá stock, precios, movimientos y el balance de tu negocio de iPhones y
            accesorios desde un solo lugar.
          </p>
        </div>
        <p className="relative text-xs text-ink-500">
          © {new Date().getFullYear()} FaceIos2 · Panel interno
        </p>
      </div>

      {/* Formulario */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src="/logo.png" alt="FaceIos2" className="h-14 w-auto" />
          </div>

          {needsBootstrap ? (
            <>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Configuración inicial
              </span>
              <h2 className="text-2xl font-bold text-ink-900">Creá la cuenta administradora</h2>
              <p className="mt-1 text-sm text-ink-500">
                Todavía no hay usuarios. Esta será la única cuenta que se puede crear desde acá;
                las demás se agregan desde el panel.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-ink-900">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-ink-500">Ingresá para administrar tu tienda.</p>
            </>
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            {needsBootstrap && (
              <Field label="Nombre">
                <input
                  className="input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Contraseña" hint={needsBootstrap ? "Mínimo 8 caracteres." : undefined}>
              <PasswordInput
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={needsBootstrap ? "new-password" : "current-password"}
              />
            </Field>

            {error && (
              <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {needsBootstrap ? "Crear cuenta y entrar" : "Ingresar"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {!needsBootstrap && (
            <p className="mt-6 text-center text-xs text-ink-400">
              ¿No tenés cuenta? Pedile al administrador que te cree un usuario desde el panel.
            </p>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-ink-400 hover:text-ink-600">
              ← Volver a la tienda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
