import { query, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: QueryCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("No autorizado.");
}

/** Panel general: inventario, ventas del mes, ganancia, stock bajo y actividad. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const products = await ctx.db.query("products").collect();
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_date")
      .order("desc")
      .collect();

    // --- Inventario ---
    let unidadesEnStock = 0;
    let valorInventarioCosto = 0;
    let valorInventarioVenta = 0;
    const stockBajo: {
      _id: string;
      name: string;
      quantity: number;
      minStock: number;
      category: string;
    }[] = [];

    for (const p of products) {
      unidadesEnStock += p.quantity;
      valorInventarioCosto += p.costPrice * p.quantity;
      valorInventarioVenta += p.salePrice * p.quantity;
      const min = p.minStock ?? 2;
      if (p.status !== "oculto" && p.quantity <= min) {
        stockBajo.push({
          _id: p._id,
          name: p.name,
          quantity: p.quantity,
          minStock: min,
          category: p.category,
        });
      }
    }

    // Conteo por categoría
    const porCategoria: Record<string, number> = {};
    for (const p of products) {
      porCategoria[p.category] = (porCategoria[p.category] ?? 0) + 1;
    }

    // --- Ventas del mes en curso ---
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let ventasMesTotal = 0;
    let ventasMesCantidad = 0;
    let gananciaMes = 0;
    let ingresosMes = 0;
    let egresosMes = 0;

    for (const t of transactions) {
      if (t.date < inicioMes) continue;
      if (t.type === "venta") {
        ventasMesTotal += t.amount;
        ventasMesCantidad += 1;
        gananciaMes += t.profit ?? 0;
      }
      if (t.type === "ingreso") {
        ingresosMes += t.amount;
        gananciaMes += t.amount;
      }
      if (t.type === "gasto") {
        egresosMes += t.amount;
        gananciaMes -= t.amount;
      }
      if (t.type === "compra") {
        egresosMes += t.amount;
      }
    }
    // ingresos del mes = ventas + ingresos extra (los "ingreso" ya se sumaron arriba)
    ingresosMes += ventasMesTotal;

    return {
      totalProductos: products.length,
      unidadesEnStock,
      valorInventarioCosto,
      valorInventarioVenta,
      gananciaInventarioPotencial: valorInventarioVenta - valorInventarioCosto,
      porCategoria,
      stockBajo: stockBajo.sort((a, b) => a.quantity - b.quantity),
      ventasMesTotal,
      ventasMesCantidad,
      gananciaMes,
      ingresosMes,
      egresosMes,
      balanceCajaMes: ingresosMes - egresosMes,
      recientes: transactions.slice(0, 8),
    };
  },
});
