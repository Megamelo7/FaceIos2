import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

async function requireAuth(ctx: QueryCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("No autorizado.");
}

function computeSummary(txs: Doc<"transactions">[]) {
  let ventasTotal = 0;
  let comprasTotal = 0;
  let gastosTotal = 0;
  let ingresosExtra = 0;
  let costoDeVentas = 0;
  let cantidadVentas = 0;

  for (const t of txs) {
    switch (t.type) {
      case "venta":
        ventasTotal += t.amount;
        costoDeVentas += (t.unitCost ?? 0) * (t.quantity ?? 0);
        cantidadVentas += 1;
        break;
      case "compra":
        comprasTotal += t.amount;
        break;
      case "gasto":
        gastosTotal += t.amount;
        break;
      case "ingreso":
        ingresosExtra += t.amount;
        break;
    }
  }

  const ingresos = ventasTotal + ingresosExtra; // dinero que entra
  const egresos = comprasTotal + gastosTotal; // dinero que sale
  const balanceCaja = ingresos - egresos; // flujo de caja
  const gananciaBruta = ventasTotal - costoDeVentas; // margen sobre ventas
  const gananciaNeta = gananciaBruta + ingresosExtra - gastosTotal; // rentabilidad

  return {
    ventasTotal,
    comprasTotal,
    gastosTotal,
    ingresosExtra,
    costoDeVentas,
    cantidadVentas,
    ingresos,
    egresos,
    balanceCaja,
    gananciaBruta,
    gananciaNeta,
  };
}

/** Resumen financiero, opcionalmente acotado a un rango de fechas. */
export const summary = query({
  args: { from: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    let txs = await ctx.db.query("transactions").collect();
    if (args.from !== undefined) txs = txs.filter((t) => t.date >= args.from!);
    if (args.to !== undefined) txs = txs.filter((t) => t.date <= args.to!);
    return computeSummary(txs);
  },
});

/** Serie mensual de los últimos N meses para gráficos. */
export const monthlySeries = query({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const months = Math.min(Math.max(args.months ?? 6, 1), 24);
    const txs = await ctx.db.query("transactions").collect();

    const now = new Date();
    const buckets: {
      key: string;
      label: string;
      ingresos: number;
      egresos: number;
      ganancia: number;
    }[] = [];
    const monthNames = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        ingresos: 0,
        egresos: 0,
        ganancia: 0,
      });
    }

    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const t of txs) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const i = index.get(key);
      if (i === undefined) continue;
      if (t.type === "venta" || t.type === "ingreso") buckets[i].ingresos += t.amount;
      if (t.type === "compra" || t.type === "gasto") buckets[i].egresos += t.amount;
      if (t.type === "venta") buckets[i].ganancia += t.profit ?? 0;
      if (t.type === "ingreso") buckets[i].ganancia += t.amount;
      if (t.type === "gasto") buckets[i].ganancia -= t.amount;
    }
    return buckets;
  },
});
