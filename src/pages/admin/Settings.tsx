import { useState, useEffect, FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FullPageLoader, Field } from "../../components/ui";
import { CURRENCIES } from "../../lib/currencies";
import { Check, Loader2, Store } from "lucide-react";

export default function Settings() {
  const settings = useQuery(api.settings.getAdmin);
  const update = useMutation(api.settings.update);

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

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
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

    </div>
  );
}
