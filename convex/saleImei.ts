import { QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * Completa los movimientos con datos del producto que no se guardaron en su
 * momento (registros anteriores a esos campos), si el producto todavía existe:
 *   - IMEI (o N° de serie) de cada venta,
 *   - color del equipo (ventas y compras).
 */
export async function withProductInfo(
  ctx: QueryCtx,
  txs: Doc<"transactions">[],
): Promise<Doc<"transactions">[]> {
  return await Promise.all(
    txs.map(async (t) => {
      const needsImei = t.type === "venta" && !t.imei;
      const needsColor = !t.productColor;
      if (!t.productId || (!needsImei && !needsColor)) return t;
      const product = await ctx.db.get(t.productId);
      if (!product) return t;
      const out = { ...t };
      if (needsImei && product.imei) out.imei = product.imei;
      if (needsColor && product.color) out.productColor = product.color;
      return out;
    }),
  );
}
