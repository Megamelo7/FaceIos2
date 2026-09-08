import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: string[];
  index: number;
  alt?: string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
};

/**
 * Ventana para ver las fotos de un producto en grande.
 *
 * Se monta con un portal en <body> a propósito: la tarjeta del catálogo usa
 * `hover:-translate-y-0.5` y `overflow-hidden`, y un ancestro con `transform`
 * rompe el `position: fixed` (la ventana quedaba recortada y parpadeaba).
 */
export default function ImageViewer({ images, index, alt = "", onIndexChange, onClose }: Props) {
  const go = useCallback(
    (delta: number) => {
      if (images.length < 2) return;
      onIndexChange((index + delta + images.length) % images.length);
    },
    [images.length, index, onIndexChange],
  );

  // Teclado + bloqueo del scroll de la página de atrás.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-card-lg animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label={alt || "Fotos del producto"}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{alt}</p>
            {images.length > 1 && (
              <p className="text-xs text-ink-500">
                Foto {index + 1} de {images.length}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Foto */}
        {/* Proporción fija: la ventana no cambia de tamaño al pasar de una foto a otra. */}
        <div className="relative flex aspect-[4/3] max-h-[60vh] items-center justify-center bg-ink-50 p-2">
          <img
            src={images[index]}
            alt={alt}
            className="h-full w-auto max-w-full object-contain"
            draggable={false}
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ink-700 shadow-sm hover:bg-white"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ink-700 shadow-sm hover:bg-white"
                aria-label="Foto siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Miniaturas */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t border-ink-100 px-4 py-3">
            {images.map((url, i) => (
              <button
                key={url + i}
                type="button"
                onClick={() => onIndexChange(i)}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  i === index ? "border-brand-500" : "border-transparent opacity-60 hover:opacity-100"
                }`}
                aria-label={`Foto ${i + 1}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
