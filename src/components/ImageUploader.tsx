import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ImagePlus, X, Loader2 } from "lucide-react";

export type ImageItem = { id: Id<"_storage">; url: string };

type Props = {
  value: ImageItem[];
  onChange: (items: ImageItem[]) => void;
  max?: number;
};

/**
 * Carga de fotos a Convex Storage. Soporta:
 *  - elegir archivos desde la PC (clic),
 *  - arrastrar y soltar,
 *  - pegar directamente desde el portapapeles (Ctrl+V).
 * Varias fotos por producto; la primera es la principal.
 */
export default function ImageUploader({ value, onChange, max = 8 }: Props) {
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const deleteUpload = useMutation(api.products.deleteUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Fotos subidas en esta sesión (aún no guardadas): si se quitan, se borran del storage.
  const newIds = useRef<Set<string>>(new Set());
  // Referencia al valor actual para evitar closures viejos durante subidas.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  async function uploadFiles(fileList: FileList | File[]) {
    setError(null);
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setError("Sólo se pueden subir imágenes.");
      return;
    }
    const room = max - valueRef.current.length;
    const batch = files.slice(0, Math.max(0, room));
    if (batch.length < files.length) setError(`Máximo ${max} fotos por producto.`);
    if (batch.length === 0) return;

    setUploading((n) => n + batch.length);
    const added: ImageItem[] = [];
    try {
      for (const file of batch) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error("upload failed");
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        newIds.current.add(storageId);
        added.push({ id: storageId, url: URL.createObjectURL(file) });
      }
      onChange([...valueRef.current, ...added]);
    } catch {
      setError("No se pudo subir la imagen. Probá de nuevo.");
    } finally {
      setUploading((n) => n - batch.length);
    }
  }

  // Ctrl+V: pegar una imagen desde el portapapeles.
  const uploadRef = useRef(uploadFiles);
  uploadRef.current = uploadFiles;
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void uploadRef.current(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function removeImage(item: ImageItem) {
    onChange(valueRef.current.filter((v) => v.id !== item.id));
    if (newIds.current.has(item.id)) {
      // Nunca se guardó en un producto: se puede borrar del storage sin riesgo.
      newIds.current.delete(item.id);
      void deleteUpload({ storageId: item.id });
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void uploadFiles(e.dataTransfer.files);
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void uploadFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {/* Zona de carga */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragging
            ? "border-brand-500 bg-brand-50"
            : "border-ink-200 bg-ink-50/60 hover:border-brand-400 hover:bg-brand-50/40"
        }`}
      >
        {uploading > 0 ? (
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        ) : (
          <ImagePlus className="h-6 w-6 text-ink-400" />
        )}
        <p className="text-sm font-medium text-ink-700">
          {uploading > 0
            ? `Subiendo ${uploading} foto${uploading > 1 ? "s" : ""}…`
            : "Hacé clic para elegir fotos, arrastralas acá"}
        </p>
        <p className="text-xs text-ink-400">
          o pegalas directamente con <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] shadow-sm">Ctrl+V</kbd>
          {" · "}hasta {max} fotos
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPick}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-3.5 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* Miniaturas */}
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {value.map((img, i) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-ink-200 bg-ink-100"
            >
              {img.url ? (
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-300">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-ink-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Principal
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(img)}
                className="absolute right-1 top-1 rounded-full bg-white/95 p-1 text-ink-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Quitar foto"
                title="Quitar foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
