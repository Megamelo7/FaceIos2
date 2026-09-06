# FaceIos2 — Gestión de venta de iPhones

Aplicación web para administrar la venta de iPhones y accesorios: **landing pública**
(catálogo sin precios), **panel de administración** con login, control de **stock**,
**precios**, **ventas** y **balance de finanzas**. Base de datos en **Convex**.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend / DB:** Convex (tiempo real)
- **Auth:** Convex Auth (email + contraseña)
- **Gráficos:** Recharts

## Puesta en marcha

Requisitos: Node 18+.

```bash
# 1. Instalar dependencias (ya hecho si clonaste con node_modules)
npm install

# 2. Conectar Convex (abre el navegador para iniciar sesión y crear el proyecto)
npx convex dev

# 3. En OTRA terminal: configurar las claves del login
npm run setup:auth

# 4. (Opcional) Cargar datos de ejemplo
npm run seed

# 5. Levantar el frontend
npm run dev
```

Luego abrí http://localhost:5173. Para el panel, entrá a `/login` y creá tu cuenta admin.

> Consejo: podés correr front + backend juntos con `npm run dev:all`.

## Estructura

```
convex/            Backend y base de datos
  schema.ts        Tablas: products, transactions, settings + auth
  auth.ts          Login por email/contraseña
  products.ts      Catálogo público (sin precios) + CRUD admin
  transactions.ts  Ventas, compras, gastos e ingresos (ajustan stock)
  finances.ts      Resumen y series mensuales
  dashboard.ts     KPIs del panel
  settings.ts      Datos de la tienda
  seed.ts          Datos de ejemplo
src/
  pages/           Landing, Login y páginas del admin
  components/       Layout, modales y UI
  lib/             Formato, categorías, hooks
```

## Seguridad del acceso

Tras crear tu primer usuario, cerrá el registro definiendo los emails autorizados:

```bash
npx convex env set ADMIN_EMAILS "tu@email.com"
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Frontend (Vite) |
| `npm run dev:backend` | Backend (Convex) |
| `npm run dev:all` | Ambos en paralelo |
| `npm run setup:auth` | Genera y configura las claves de login |
| `npm run seed` | Carga datos de ejemplo |
| `npm run build` | Build de producción |
