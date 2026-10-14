import { QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * IMEI (o N° de serie) de cada venta: el que se guardó al vender o, en las
 * ventas anteriores a ese campo, el del producto (si todavía existe).
 */
export async function withSaleImei(
  ctx: QueryCtx,
  txs: Doc<"transactions">[],
): Promise<Doc<"transactions">[]> {
  return await Promise.all(
    txs.map(async (t) => {
      if (t.type !== "venta" || t.imei || !t.productId) return t;
      const product = await ctx.db.get(t.productId);
      return product?.imei ? { ...t, imei: product.imei } : t;
    }),
  );
}
