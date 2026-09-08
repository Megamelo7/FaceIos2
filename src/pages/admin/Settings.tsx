import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FullPageLoader, Field, Modal } from "../../components/ui";
import { CURRENCIES } from "../../lib/currencies";
import { Check, Loader2, Store, Upload, Trash2 } from "lucide-react";

const MAX_LOGO_MB = 4;

export default function Settings() {
  const settings = useQuery(api.settings.getAdmin);
  const update = useMutation(api.settings.update);
  const generateLogoUploadUrl = useMutation(api.settings.generateLogoUploadUrl);
  const setLogo = useMutation(api.settings.setLogo);

  const [form, setForm] = useState({
    storeName: "",
    whatsapp: "",
    instagram: "",
    email: "",
    address: "",
    currency: "ARS",
    heroTitle: "",
    heroSubtitle: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const logoInput = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        storeName: settings.storeName ?? "",
        whatsapp: settings.whatsapp ?? "",
        instagram: settings.instagram ?? "",
        email: settings.email ?? "",
        address: settings.address ?? "",
        currency: settings.currency ?? "ARS",
        heroTitle: settings.heroTitle ?? "",
        heroSubtitle: settings.heroSubtitle ?? "",
      });
    }
  }, [settings]);

  if (settings === undefined) return <FullPageLoader label="Cargando ajustes…" />;

  const logoUrl = settings.logoUrl || "";

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Guardar pide confirmación antes de aplicar los cambios.
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    setConfirmOpen(true);
  }

  async function doSave() {
    setConfirmOpen(false);
    setSaving(true);
    try {
      await update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function onPickLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("El archivo tiene que ser una imagen.");
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setLogoError(`La imagen no puede superar los ${MAX_LOGO_MB} MB.`);
      return;
    }
    setLogoBusy(true);
    setLogoError(null);
    try {
      const uploadUrl = await generateLogoUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await setLogo({ storageId });
    } catch {
      setLogoError("No se pudo subir el logo. Probá de nuevo.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setLogoError(null);
    try {
      await setLogo({ storageId: null });
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={onSubmit} className="card p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Store className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-ink-900">Datos de la tienda</h3>
            <p className="text-xs text-ink-500">Se usan en la landing pública y el panel.</p>
          </div>
        </div>

        {/* Logo de la organización: se aplica al instante, en la tienda y en el panel. */}
        <div className="mb-6 rounded-2xl border border-ink-200 bg-ink-50/60 p-4">
          <p className="label">Logo de la organización</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-white px-2">
              <img
                src={logoUrl || "/logo.png"}
                alt="Logo actual"
                className="max-h-12 w-auto max-w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={logoBusy}
                onClick={() => logoInput.current?.click()}
              >
                {logoBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {logoUrl ? "Cambiar logo" : "Subir logo"}
              </button>
              {logoUrl && (
                <button type="button" className="btn-danger" disabled={logoBusy} onClick={removeLogo}>
                  <Trash2 className="h-4 w-4" /> Quitar
                </button>
              )}
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickLogo}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-400">
            PNG o SVG con fondo transparente. Hasta {MAX_LOGO_MB} MB. Sin logo propio se usa el
            de FaceIos2.
          </p>
          {logoError && <p className="mt-2 text-xs text-red-600">{logoError}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre de la tienda">
            <input className="input" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
          </Field>
          <Field label="Moneda" hint="Se usa para mostrar precios, totales y el balance.">
            <select
              className="input"
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {/* Si hay un código guardado que no está en la lista, se conserva como opción. */}
              {form.currency && !CURRENCIES.some((c) => c.code === form.currency) && (
                <option value={form.currency}>{form.currency}</option>
              )}
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="WhatsApp" hint="Con código de país, sin +. Ej: 5491112345678">
            <input className="input" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
          <Field label="Instagram" hint="Usuario sin @">
            <input className="input" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Dirección / Zona">
            <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
        </div>

        <div className="mt-6 border-t border-ink-100 pt-5">
          <h4 className="mb-3 text-sm font-semibold text-ink-800">Portada de la tienda</h4>
          <div className="space-y-4">
            <Field label="Título principal">
              <input className="input" value={form.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
            </Field>
            <Field label="Subtítulo">
              <textarea
                className="input min-h-[70px] resize-y"
                value={form.heroSubtitle}
                onChange={(e) => set("heroSubtitle", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button className="btn-primary" disabled={saving} type="submit">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar cambios
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">✓ Guardado</span>}
        </div>
      </form>

      {/* Confirmación antes de guardar */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Guardar cambios"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={doSave}>
              <Check className="h-4 w-4" /> Sí, guardar
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Los datos de la tienda se van a actualizar en la landing pública y en el panel. ¿Deseás
          continuar?
        </p>
      </Modal>
    </div>
  );
}
