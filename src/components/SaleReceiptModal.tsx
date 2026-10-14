import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Modal, ColorDot } from "./ui";
import { useCurrency } from "../lib/useCurrency";
import {
  buildReceiptPdf,
  receiptFileName,
  receiptLabel,
  itemDetail,
  identifierLabel,
  warrantyText,
  shortDate,
} from "../lib/receiptPdf";
import { CheckCircle2, Download, Loader2, MessageCircle, ShieldCheck } from "lucide-react";

/** Teléfono para wa.me: sólo dígitos con código de país (Argentina si no lo tiene). */
function waPhone(contact?: string): string | null {
  if (!contact || contact.includes("@")) return null;
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (contact.trim().startsWith("+") || digits.startsWith("54")) return digits;
  const local = digits.replace(/^0/, "");
  return local.length === 10 ? `549${local}` : local;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Comprobante de una venta (todos sus artículos): vista previa, descarga en
 * PDF y envío por WhatsApp. En el celular comparte el PDF directo; en la PC lo
 * descarga y abre el chat del cliente con el mensaje listo para adjuntarlo.
 */
export default function SaleReceiptModal({
  saleId,
  onClose,
  justRecorded = false,
}: {
  saleId: Id<"transactions">;
  onClose: () => void;
  /** Se abre recién registrada la venta: muestra el aviso de "Venta registrada". */
  justRecorded?: boolean;
}) {
  const data = useQuery(api.transactions.receipt, { id: saleId });
  const { money, moneyIn } = useCurrency();
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // El PDF se arma apenas llegan los datos, así los botones responden al toque
  // (compartir y abrir WhatsApp tienen que salir directo del clic).
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setPdf(null);
    buildReceiptPdf(data)
      .then((blob) => !cancelled && setPdf(blob))
      .catch(() => !cancelled && setError("No se pudo generar el PDF del comprobante."));
    return () => {
      cancelled = true;
    };
  }, [data]);

  const label = data ? receiptLabel(data.number) : "";
  const storeName = data?.store.name || "la tienda";

  function onDownload() {
    if (!data || !pdf) return;
    downloadBlob(pdf, receiptFileName(data));
    setNotice(null);
  }

  async function onWhatsApp() {
    if (!data || !pdf) return;
    const name = receiptFileName(data);
    const greeting = data.customerName ? `Hola ${data.customerName.split(" ")[0]}!` : "Hola!";
    const text = `${greeting} Te enviamos el comprobante de tu compra en ${storeName}${
      label ? ` (N° ${label})` : ""
    }, con los datos del equipo y la garantía. ¡Gracias por tu compra!`;
    const file = new File([pdf], name, { type: "application/pdf" });
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
      } catch {
        // Cancelado por el usuario: no hace falta avisar.
      }
      return;
    }
    downloadBlob(pdf, name);
    const phone = waPhone(data.customerContact);
    window.open(
      `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener",
    );
    setNotice(
      phone
        ? "Se descargó el PDF y se abrió el chat del cliente: adjuntá el archivo y enviá."
        : "Se descargó el PDF y se abrió WhatsApp: elegí el contacto, adjuntá el archivo y enviá.",
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={label ? `Comprobante N° ${label}` : "Comprobante de venta"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} type="button">
            Cerrar
          </button>
          <button className="btn-secondary" onClick={onDownload} disabled={!pdf} type="button">
            {pdf ? <Download className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            Descargar PDF
          </button>
          <button className="btn-primary" onClick={onWhatsApp} disabled={!pdf} type="button">
            <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
          </button>
        </>
      }
    >
      {data === undefined ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Armando el comprobante…
        </div>
      ) : (
        <div className="space-y-4">
          {justRecorded && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Venta registrada. Enviale el comprobante
              al cliente.
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
          )}
          {notice && (
            <div className="rounded-xl bg-sky-50 px-3.5 py-2.5 text-sm text-sky-700">{notice}</div>
          )}

          <div className="rounded-xl border border-ink-100">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Cliente</p>
                <p className="font-semibold text-ink-900">{data.customerName || "Consumidor final"}</p>
                {data.customerContact && (
                  <p className="text-xs text-ink-500">{data.customerContact}</p>
                )}
              </div>
              <div className="text-right text-sm text-ink-600">
                <p>{shortDate(data.date)}</p>
                {data.paymentMethod && <p className="text-xs text-ink-400">{data.paymentMethod}</p>}
              </div>
            </div>

            <div className="divide-y divide-ink-100">
              {data.items.map((item) => {
                const detail = itemDetail(item);
                const warranty = warrantyText(item, storeName);
                return (
                  <div key={item._id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="flex items-center gap-1.5 font-medium text-ink-900">
                        <ColorDot color={item.color} />
                        {item.name}
                        {item.quantity > 1 && <span className="text-ink-400"> ×{item.quantity}</span>}
                      </p>
                      {detail && <p className="text-xs text-ink-500">{detail}</p>}
                      {item.imei && (
                        <p className="text-xs text-ink-500">
                          {identifierLabel(item)}: <span className="font-mono">{item.imei}</span>
                        </p>
                      )}
                      {warranty && (
                        <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {warranty}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-semibold text-ink-900">{money(item.amount)}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3">
              <span className="text-sm font-medium text-ink-600">Total</span>
              <span className="text-right">
                <span className="block text-lg font-bold text-ink-900">{money(data.total)}</span>
                {data.totalArs !== undefined && (
                  <span className="block text-xs text-ink-500">
                    Pagado en pesos: {moneyIn(data.totalArs, "ARS")}
                  </span>
                )}
              </span>
            </div>
          </div>

          {!data.store.warrantyTerms?.trim() && (
            <p className="text-xs text-ink-400">
              Tip: cargá las condiciones de garantía en Ajustes → Garantías y se imprimen al pie del
              comprobante.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
