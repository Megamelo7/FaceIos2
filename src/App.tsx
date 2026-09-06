import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { FullPageLoader } from "./components/ui";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Movements from "./pages/admin/Movements";
import Finances from "./pages/admin/Finances";
import Settings from "./pages/admin/Settings";
import Users from "./pages/admin/Users";
import Catalog from "./pages/admin/Catalog";

function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-100">
        <FullPageLoader label="Verificando sesión…" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="stock" element={<Products />} />
          <Route path="movimientos" element={<Movements />} />
          <Route path="finanzas" element={<Finances />} />
          <Route path="modelos" element={<Catalog />} />
          <Route path="usuarios" element={<Users />} />
          <Route path="ajustes" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
