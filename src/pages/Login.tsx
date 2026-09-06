import { useState, FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { Smartphone, ArrowRight, Loader2 } from "lucide-react";
import { Field } from "../components/ui";

export default function Login() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) return <Navigate to="/admin" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", { email, password, name, flow });
      // Al autenticarse, el router redirige a /admin automáticamente.
    } catch (err) {
      if (err instanceof ConvexError) {
        setError(String(err.data));
      } else if (flow === "signIn") {
        setError("Email o contraseña incorrectos.");
      } else {
        setError("No pudimos crear la cuenta. ¿Quizás el email ya existe?");
      }
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
        <Link to="/" className="relative flex items-center gap-2 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Smartphone className="h-5 w-5" />
          </div>
          iPhone Store
        </Link>
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight">
            Panel de gestión
          </h1>
          <p className="mt-3 max-w-sm text-ink-400">
            Controlá stock, precios, ventas y el balance de tu negocio de iPhones y accesorios
            desde un solo lugar.
          </p>
        </div>
        <p className="relative text-xs text-ink-500">
          © {new Date().getFullYear()} iPhone Store · Panel interno
        </p>
      </div>

      {/* Formulario */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-900 text-white">
              <Smartphone className="h-6 w-6" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-ink-900">
            {flow === "signIn" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {flow === "signIn"
              ? "Ingresá para administrar tu tienda."
              : "Registrá el usuario administrador."}
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            {flow === "signUp" && (
              <Field label="Nombre">
                <input
                  className="input"
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
            <Field label="Contraseña">
              <input
                className="input"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              />
            </Field>

            {error && (
              <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {flow === "signIn" ? "Ingresar" : "Crear cuenta"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-500">
            {flow === "signIn" ? (
              <>
                ¿Primera vez?{" "}
                <button
                  className="font-semibold text-brand-600 hover:text-brand-700"
                  onClick={() => {
                    setFlow("signUp");
                    setError(null);
                  }}
                >
                  Crear la cuenta admin
                </button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                <button
                  className="font-semibold text-brand-600 hover:text-brand-700"
                  onClick={() => {
                    setFlow("signIn");
                    setError(null);
                  }}
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-xs text-ink-400 hover:text-ink-600">
              ← Volver a la tienda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
