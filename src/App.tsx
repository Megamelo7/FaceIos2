import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { FullPageLoader } from "./components/ui";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Sales from "./pages/admin/Sales";
import Finances from "./pages/admin/Finances";
import Settings from "./pages/admin/Settings";

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
          <Route path="ventas" element={<Sales />} />
          <Route path="finanzas" element={<Finances />} />
          <Route path="ajustes" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
