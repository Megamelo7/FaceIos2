import { Database, Terminal, KeyRound } from "lucide-react";

/** Se muestra cuando falta VITE_CONVEX_URL (Convex aún no conectado). */
export function SetupNeeded() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6 text-ink-100">
      <div className="w-full max-w-lg rounded-3xl border border-ink-800 bg-ink-900 p-8 shadow-2xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300">
          <Database className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Falta conectar Convex</h1>
        <p className="mt-2 text-sm text-ink-400">
          La base de datos todavía no está enlazada. Seguí estos pasos en la terminal, dentro
          de la carpeta del proyecto:
        </p>

        <ol className="mt-6 space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-brand-300">1</span>
            <div>
              <p className="flex items-center gap-2 font-medium text-ink-200">
                <Terminal className="h-4 w-4" /> Iniciar Convex
              </p>
              <code className="mt-1 block rounded-lg bg-ink-950 px-3 py-2 font-mono text-xs text-emerald-300">
                npx convex dev
              </code>
              <p className="mt-1 text-xs text-ink-500">
                Se abre el navegador para iniciar sesión y crear el deployment.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-brand-300">2</span>
            <div>
              <p className="flex items-center gap-2 font-medium text-ink-200">
                <KeyRound className="h-4 w-4" /> Configurar las claves de login
              </p>
              <code className="mt-1 block rounded-lg bg-ink-950 px-3 py-2 font-mono text-xs text-emerald-300">
                npm run setup:auth
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-brand-300">3</span>
            <div>
              <p className="font-medium text-ink-200">Recargar esta página</p>
              <p className="mt-1 text-xs text-ink-500">
                Una vez conectado, la app arranca automáticamente.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
