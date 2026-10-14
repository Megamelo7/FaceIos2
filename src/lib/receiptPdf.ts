import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { formatCurrency } from "./format";
import { CONDITIONS } from "./categories";

/** Datos del comprobante tal como los devuelve `transactions.receipt`. */
export type ReceiptData = FunctionReturnType<typeof api.transactions.receipt>;
export type ReceiptItem = ReceiptData["items"][number];

// Helvetica (la fuente del PDF) no tiene los espacios finos que usa Intl.
const plain = (s: string) => s.replace(/[  ]/g, " ");
const money = (v: number, currency: string) => plain(formatCurrency(v, currency));
export const shortDate = (ts: number) =>
  new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** N° de comprobante con ceros a la izquierda ("" en ventas anteriores al N°). */
export const receiptLabel = (n: number | null) => (n === null ? "" : String(n).padStart(6, "0"));

/** "IMEI" o "N° de serie" (notebooks). */
export const identifierLabel = (i: ReceiptItem) => (i.category === "notebook" ? "N° de serie" : "IMEI");

/** Capacidad · color · condición · batería. */
export function itemDetail(i: ReceiptItem): string {
  return [
    i.storage,
    i.color,
    i.condition ? CONDITIONS[i.condition].label : undefined,
    i.batteryHealth ? `Batería ${i.batteryHealth}%` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Garantía del artículo en una línea ("" si no lleva). */
export function warrantyText(i: ReceiptItem, storeName: string): string {
  if (i.warrantyType === "apple") {
    return i.warrantyEnd
      ? `Garantía Apple vigente hasta el ${shortDate(i.warrantyEnd)}`
      : "Garantía oficial Apple (desde la activación del equipo)";
  }
  if (i.warrantyType === "tienda" && i.warrantyStart && i.warrantyEnd) {
    return `Garantía de ${storeName}: ${i.warrantyDays} días, del ${shortDate(i.warrantyStart)} al ${shortDate(i.warrantyEnd)}`;
  }
  return "";
}

/** Nombre del archivo: "Comprobante 000123 - Juan Pérez.pdf". */
export function receiptFileName(r: ReceiptData): string {
  const parts = [
    "Comprobante",
    receiptLabel(r.number) || shortDate(r.date).replace(/\//g, "-"),
    r.customerName ? `- ${r.customerName}` : "",
  ];
  return `${parts.filter(Boolean).join(" ").replace(/[\\/:*?"<>|]/g, "")}.pdf`;
}

/**
 * Carga una imagen como PNG (data URL) de `height` px de alto como máximo (los
 * SVG se agrandan hasta ese alto) y con la opacidad dada; `null` si no se puede.
 */
async function loadImage(
  url: string,
  { height, opacity = 1 }: { height: number; opacity?: number },
): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = objectUrl;
      });
      // Se achica (las fotos) para que el PDF pese poco; los SVG se dibujan nítidos al alto pedido.
      const scale = blob.type.includes("svg")
        ? height / img.naturalHeight
        : Math.min(1, height / img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return { data: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

const INK = [15, 23, 42] as const; // ink-900
const MUTED = [100, 116, 139] as const; // ink-500
const LINE = [226, 232, 240] as const; // ink-200
const GREEN = [4, 120, 87] as const; // emerald-700

/** Arma el PDF (A4) del comprobante de venta. */
export async function buildReceiptPdf(r: ReceiptData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 16; // margen
  const R = W - M; // borde derecho
  const currency = r.store.currency || "ARS";
  const storeName = r.store.name || "la tienda";
  let y = M;

  const color = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const rule = (at: number) => {
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.3);
    doc.line(M, at, R, at);
  };
  // Marca de agua: la mascota, tenue y centrada detrás del contenido de cada página.
  const [logo, mascot] = await Promise.all([
    loadImage(r.store.logoUrl || "/logo.png", { height: 240 }),
    loadImage("/mascota.svg", { height: 600, opacity: 0.07 }),
  ]);
  const watermark = () => {
    if (!mascot) return;
    const w = 125;
    const h = (w / mascot.w) * mascot.h;
    doc.addImage(mascot.data, "PNG", (W - w) / 2, (297 - h) / 2 + 10, w, h, "mascota", "FAST");
  };
  watermark();

  // Salto de página si lo que sigue no entra.
  const ensure = (h: number) => {
    if (y + h > 280) {
      doc.addPage();
      watermark();
      y = M;
    }
  };

  /* ── Encabezado: logo + tienda | comprobante ── */
  let textX = M;
  if (logo) {
    const h = 18;
    const w = Math.min(40, (logo.w / logo.h) * h);
    doc.addImage(logo.data, "PNG", M, y - 2, w, (w / logo.w) * logo.h, undefined, "FAST");
    textX = M + w + 5;
  }
  font(15, "bold");
  color(INK);
  doc.text(storeName, textX, y + 4);
  font(8.5);
  color(MUTED);
  const contact = [
    r.store.address,
    r.store.instagram ? `@${r.store.instagram.replace(/^@/, "")}` : "",
    r.store.email,
    r.store.whatsapp && !/^https?:/i.test(r.store.whatsapp) ? `WhatsApp ${r.store.whatsapp}` : "",
  ].filter(Boolean);
  contact.forEach((line, i) => doc.text(line!, textX, y + 9.5 + i * 4));

  font(11, "bold");
  color(INK);
  doc.text("COMPROBANTE DE VENTA", R, y + 4, { align: "right" });
  font(9.5);
  color(MUTED);
  const label = receiptLabel(r.number);
  if (label) doc.text(`N° ${label}`, R, y + 9.5, { align: "right" });
  doc.text(`Fecha: ${shortDate(r.date)}`, R, y + (label ? 14 : 9.5), { align: "right" });

  y += Math.max(22, 11 + contact.length * 4);
  rule(y);
  y += 8;

  /* ── Cliente y pago ── */
  font(7.5, "bold");
  color(MUTED);
  doc.text("CLIENTE", M, y);
  if (r.paymentMethod) doc.text("MEDIO DE PAGO", R, y, { align: "right" });
  font(10.5, "bold");
  color(INK);
  doc.text(r.customerName || "Consumidor final", M, y + 5.5);
  if (r.paymentMethod) doc.text(r.paymentMethod, R, y + 5.5, { align: "right" });
  if (r.customerContact) {
    font(8.5);
    color(MUTED);
    doc.text(r.customerContact, M, y + 10);
  }
  y += r.customerContact ? 17 : 13;

  /* ── Artículos ── */
  const colQty = 132;
  const colUnit = 163;
  doc.setFillColor(248, 250, 252); // ink-50
  doc.rect(M, y - 4.5, R - M, 7.5, "F");
  font(7.5, "bold");
  color(MUTED);
  doc.text("ARTÍCULO", M + 2, y);
  doc.text("CANT.", colQty, y, { align: "right" });
  doc.text("PRECIO UNIT.", colUnit, y, { align: "right" });
  doc.text("IMPORTE", R - 2, y, { align: "right" });
  y += 8;

  const nameWidth = colQty - M - 14;
  for (const item of r.items) {
    const name = doc.splitTextToSize(item.name, nameWidth) as string[];
    const lines: { text: string; tone: readonly [number, number, number] }[] = [];
    const detail = itemDetail(item);
    if (detail) lines.push({ text: detail, tone: MUTED });
    if (item.imei) lines.push({ text: `${identifierLabel(item)}: ${item.imei}`, tone: MUTED });
    const warranty = warrantyText(item, storeName);
    if (warranty) lines.push({ text: warranty, tone: GREEN });
    const wrapped = lines.flatMap((l) =>
      (doc.splitTextToSize(l.text, nameWidth + 8) as string[]).map((text) => ({ text, tone: l.tone })),
    );
    ensure(name.length * 5 + wrapped.length * 4.2 + 6);

    font(10, "bold");
    color(INK);
    doc.text(name, M + 2, y);
    font(9.5);
    doc.text(String(item.quantity), colQty, y, { align: "right" });
    doc.text(money(item.unitPrice, currency), colUnit, y, { align: "right" });
    font(9.5, "bold");
    doc.text(money(item.amount, currency), R - 2, y, { align: "right" });
    let ly = y + name.length * 5 - 0.5;
    font(8.5);
    for (const l of wrapped) {
      color(l.tone);
      doc.text(l.text, M + 2, ly);
      ly += 4.2;
    }
    y = ly + 2.5;
    rule(y - 1.5);
    y += 4;
  }

  /* ── Total ── */
  ensure(20);
  font(9.5);
  color(MUTED);
  doc.text("Total", colUnit, y + 1, { align: "right" });
  font(13, "bold");
  color(INK);
  doc.text(money(r.total, currency), R - 2, y + 1, { align: "right" });
  y += 6;
  if (r.totalArs !== undefined) {
    font(8.5);
    color(MUTED);
    const rate = r.fxRate ? ` (cotización ${money(r.fxRate, "ARS")} por US$)` : "";
    doc.text(`Pagado en pesos: ${money(r.totalArs, "ARS")}${rate}`, R - 2, y + 1, { align: "right" });
    y += 6;
  }
  y += 4;

  /* ── Notas y condiciones ── */
  const block = (title: string, text: string) => {
    const body = doc.splitTextToSize(text, R - M) as string[];
    ensure(8 + body.length * 4);
    font(7.5, "bold");
    color(MUTED);
    doc.text(title, M, y);
    font(8.5);
    color(INK);
    doc.text(body, M, y + 4.5);
    y += 8 + body.length * 4;
  };
  if (r.notes) block("NOTAS", r.notes);
  if (r.store.warrantyTerms?.trim()) block("CONDICIONES DE GARANTÍA", r.store.warrantyTerms.trim());

  /* ── Pie ── */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font(7.5);
    color(MUTED);
    doc.text(
      `Comprobante no válido como factura · ${storeName}${pages > 1 ? ` · Página ${p} de ${pages}` : ""}`,
      W / 2,
      290,
      { align: "center" },
    );
  }

  return doc.output("blob");
}
