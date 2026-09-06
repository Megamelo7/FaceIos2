import { useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Wallet,
  Layers,
  Contact,
  Settings as SettingsIcon,
  Users as UsersIcon,
  LogOut,
  Menu,
  X,
  Smartphone,
  ExternalLink,
} from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/stock", label: "Stock y precios", icon: Package },
  { to: "/admin/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { to: "/admin/clientes", label: "Clientes", icon: Contact },
  { to: "/admin/finanzas", label: "Finanzas", icon: Wallet },
  { to: "/admin/modelos", label: "Modelos", icon: Layers },
  { to: "/admin/usuarios", label: "Usuarios", icon: UsersIcon },
  { to: "/admin/ajustes", label: "Ajustes", icon: SettingsIcon },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/stock": "Stock y precios",
  "/admin/movimientos": "Movimientos",
  "/admin/clientes": "Clientes",
  "/admin/finanzas": "Finanzas",
  "/admin/modelos": "Modelos y catálogo",
  "/admin/usuarios": "Usuarios",
  "/admin/ajustes": "Ajustes",
};

export default function AdminLayout() {
  const { signOut } = useAuthActions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const settings = useQuery(api.settings.getAdmin);
  const storeName = settings?.storeName ?? "iPhone Store";
  const title = PAGE_TITLES[location.pathname] ?? "Panel";

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{storeName}</p>
          <p className="text-xs text-ink-500">Panel de gestión</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-ink-400 hover:bg-white/5 hover:text-ink-100"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-400 hover:bg-white/5 hover:text-ink-100"
        >
          <ExternalLink className="h-[18px] w-[18px]" />
          Ver tienda
        </a>
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink-950 lg:block">
        {SidebarContent}
      </aside>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-ink-950 shadow-2xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-ink-100/80 px-4 backdrop-blur-md sm:px-6">
          <button
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-200 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-ink-900">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="btn-secondary hidden sm:inline-flex" target="_blank">
              <ExternalLink className="h-4 w-4" />
              Tienda
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>

      {/* Botón cerrar mobile flotante cuando el drawer está abierto */}
      {mobileOpen && (
        <button
          className="fixed right-4 top-4 z-50 rounded-lg bg-white p-2 text-ink-700 shadow-lg lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
