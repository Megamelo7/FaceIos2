import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../lib/theme";
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
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
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

const COLLAPSED_KEY = "faceios2-sidebar-collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AdminLayout() {
  const { signOut } = useAuthActions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { isDark, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const settings = useQuery(api.settings.getAdmin);
  const storeName = settings?.storeName ?? "iPhone Store";
  const title = PAGE_TITLES[location.pathname] ?? "Panel";

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // Sin persistencia: queda como está en esta pestaña.
    }
  }, [collapsed]);

  // `compact`: sólo íconos (sidebar achicado en desktop).
  const renderSidebar = (compact: boolean) => (
    <div className="flex h-full flex-col">
      <div className={compact ? "flex justify-center px-2 py-5" : "px-5 py-5"}>
        <div className={`w-fit rounded-xl bg-white ${compact ? "p-1.5" : "px-3 py-2"}`}>
          <img
            src={settings?.logoUrl || "/logo.png"}
            alt={storeName}
            className={compact ? "h-6 w-9 object-contain" : "h-9 w-auto"}
          />
        </div>
        {!compact && (
          <>
            <p className="mt-2 truncate text-xs text-ink-500">Panel de gestión · {storeName}</p>
            <p className="mt-0.5 text-xs text-ink-600">V {__APP_VERSION__}</p>
          </>
        )}
      </div>

      <nav className={`flex-1 space-y-1 py-3 ${compact ? "px-2" : "px-3"}`}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            title={compact ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                compact ? "justify-center" : "px-3"
              } ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-ink-400 hover:bg-white/5 hover:text-ink-100"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!compact && item.label}
          </NavLink>
        ))}
      </nav>

      <div className={`space-y-1 border-t border-white/10 py-3 ${compact ? "px-2" : "px-3"}`}>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          title={compact ? "Ver tienda" : undefined}
          className={`flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-ink-400 hover:bg-white/5 hover:text-ink-100 ${
            compact ? "justify-center" : "px-3"
          }`}
        >
          <ExternalLink className="h-[18px] w-[18px] shrink-0" />
          {!compact && "Ver tienda"}
        </a>
        <button
          onClick={() => void signOut()}
          title={compact ? "Cerrar sesión" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-ink-400 hover:bg-red-500/10 hover:text-red-300 ${
            compact ? "justify-center" : "px-3"
          }`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!compact && "Cerrar sesión"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Sidebar desktop */}
      <aside
        className={`ink-light fixed inset-y-0 left-0 z-30 hidden overflow-hidden bg-ink-950 transition-[width] duration-200 lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="ink-light absolute inset-y-0 left-0 w-64 bg-ink-950 shadow-2xl">
            {renderSidebar(false)}
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div
        className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-64"}`}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-ink-100/80 px-4 backdrop-blur-md sm:px-6">
          <button
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-200 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden rounded-lg p-2 text-ink-600 hover:bg-ink-200 lg:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Mostrar menú" : "Achicar menú"}
            title={collapsed ? "Mostrar menú" : "Achicar menú"}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <h1 className="text-lg font-bold text-ink-900">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="btn-secondary px-2.5"
              onClick={toggleTheme}
              aria-label={isDark ? "Modo claro" : "Modo oscuro"}
              title={isDark ? "Modo claro" : "Modo oscuro"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
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
          className="fixed right-4 top-4 z-50 rounded-lg bg-surface p-2 text-ink-700 shadow-lg lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
