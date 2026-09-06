import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import {
  CATEGORIES,
  CONDITIONS,
  CATEGORY_ORDER,
  Category,
  Condition,
} from "../lib/categories";
import {
  Smartphone,
  ShieldCheck,
  Truck,
  BadgeCheck,
  MessageCircle,
  Lock,
  Instagram,
  ChevronRight,
  BatteryCharging,
} from "lucide-react";

type PublicProduct = {
  _id: string;
  name: string;
  category: Category;
  brand?: string;
  model?: string;
  storage?: string;
  color?: string;
  condition: Condition;
  batteryHealth?: number;
  batteryType?: "original" | "reacondicionada";
  imageUrl?: string;
  description?: string;
  featured: boolean;
  inStock: boolean;
};

function waLink(number: string, text: string) {
  const clean = (number || "").replace(/[^\d]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export default function Landing() {
  const products = useQuery(api.products.listPublic) as PublicProduct[] | undefined;
  const settings = useQuery(api.settings.get);

  const storeName = settings?.storeName ?? "iPhone Store";
  const whatsapp = settings?.whatsapp ?? "";
  const heroTitle = settings?.heroTitle ?? "iPhone, como debe ser.";
  const heroSubtitle =
    settings?.heroSubtitle ??
    "Equipos nuevos y usados con garantía, y todos los accesorios. Consultá disponibilidad.";

  const sorted = (products ?? [])
    .slice()
    .sort((a, b) => Number(b.featured) - Number(a.featured));

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: sorted.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-white text-ink-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white">
              <Smartphone className="h-5 w-5" />
            </span>
            {storeName}
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-600 md:flex">
            <a href="#catalogo" className="hover:text-ink-900">Catálogo</a>
            <a href="#nosotros" className="hover:text-ink-900">Por qué nosotros</a>
            <a href="#contacto" className="hover:text-ink-900">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            {whatsapp && (
              <a
                href={waLink(whatsapp, `Hola ${storeName}! Quería hacer una consulta.`)}
                target="_blank"
                rel="noreferrer"
                className="btn-dark hidden sm:inline-flex"
              >
                <MessageCircle className="h-4 w-4" /> Consultar
              </a>
            )}
            <Link
              to="/login"
              className="btn-ghost"
              title="Acceso al panel"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Acceso</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden bg-ink-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(700px circle at 25% 15%, rgba(99,102,241,.35), transparent 55%), radial-gradient(600px circle at 80% 60%, rgba(139,92,246,.22), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-ink-200">
            <BadgeCheck className="h-4 w-4 text-brand-300" /> Equipos con garantía
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-300">{heroSubtitle}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#catalogo" className="btn-primary px-6 py-3 text-base">
              Ver catálogo <ChevronRight className="h-4 w-4" />
            </a>
            {whatsapp && (
              <a
                href={waLink(whatsapp, `Hola ${storeName}! Quería consultar precios y disponibilidad.`)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-6 py-3 text-base"
              >
                <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section id="nosotros" className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-5 py-12 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Garantía real", desc: "Todos los equipos con garantía y prueba antes de comprar." },
            { icon: BadgeCheck, title: "Calidad verificada", desc: "Nuevos, usados y reacondicionados en excelente estado." },
            { icon: Truck, title: "Entrega rápida", desc: "Coordinamos entrega en el día según tu zona." },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
                <b.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink-900">{b.title}</p>
                <p className="text-sm text-ink-500">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section id="catalogo" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Nuestro catálogo</h2>
          <p className="mt-2 text-ink-500">
            Consultá el precio y la disponibilidad actualizada por WhatsApp.
          </p>
        </div>

        {products === undefined ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-ink-100" />
            ))}
          </div>
        ) : byCategory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 py-20 text-center text-ink-500">
            Todavía no hay productos publicados. Volvé pronto.
          </div>
        ) : (
          <div className="space-y-14">
            {byCategory.map(({ cat, items }) => {
              const meta = CATEGORIES[cat];
              return (
                <div key={cat}>
                  <div className="mb-5 flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.color}`}>
                      <meta.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-bold text-ink-900">{meta.plural}</h3>
                    <span className="text-sm text-ink-400">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((p) => (
                      <ProductCard key={p._id} product={p} whatsapp={whatsapp} storeName={storeName} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Contacto / CTA final */}
      <section id="contacto" className="bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center">
          <h2 className="text-3xl font-bold">¿Querés saber el precio?</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-300">
            Escribinos y te pasamos precio, disponibilidad y formas de pago al instante.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {whatsapp && (
              <a
                href={waLink(whatsapp, `Hola ${storeName}! Quería hacer una consulta.`)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary px-6 py-3 text-base"
              >
                <MessageCircle className="h-5 w-5" /> Escribir por WhatsApp
              </a>
            )}
            {settings?.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-6 py-3 text-base"
              >
                <Instagram className="h-5 w-5" /> @{settings.instagram}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-ink-500 sm:flex-row">
          <p className="flex items-center gap-2 font-semibold text-ink-700">
            <Smartphone className="h-4 w-4" /> {storeName}
          </p>
          <p>© {new Date().getFullYear()} · Todos los derechos reservados</p>
          <Link to="/login" className="hover:text-ink-800">Acceso al panel</Link>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({
  product,
  whatsapp,
  storeName,
}: {
  product: PublicProduct;
  whatsapp: string;
  storeName: string;
}) {
  const meta = CATEGORIES[product.category];
  const cond = CONDITIONS[product.condition];
  const specs = [product.storage, product.color].filter(Boolean).join(" · ");
  const msg = `Hola ${storeName}! Me interesa el ${product.name}${
    product.storage ? ` ${product.storage}` : ""
  }. ¿Está disponible y qué precio tiene?`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-lg">
      {/* Imagen */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-ink-100 to-ink-50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">
            <meta.icon className="h-16 w-16" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <span className={`badge ${cond.color}`}>{cond.label}</span>
          {product.featured && (
            <span className="badge bg-ink-900 text-white">Destacado</span>
          )}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="badge bg-ink-900 text-white">Sin stock · Consultar</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-5">
        <h4 className="font-semibold text-ink-900">{product.name}</h4>
        {specs && <p className="mt-0.5 text-sm text-ink-500">{specs}</p>}
        {(product.batteryHealth || product.batteryType) && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-400">
            <BatteryCharging className="h-3.5 w-3.5" />
            {product.batteryHealth ? `Batería ${product.batteryHealth}%` : "Batería"}
            {product.batteryType
              ? ` · ${product.batteryType === "original" ? "original" : "reacondicionada"}`
              : ""}
          </p>
        )}
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-500">{product.description}</p>
        )}
        <div className="mt-4 flex-1" />
        <a
          href={waLink(whatsapp, msg)}
          target="_blank"
          rel="noreferrer"
          className="btn-dark w-full"
        >
          <MessageCircle className="h-4 w-4" /> Consultar precio
        </a>
      </div>
    </div>
  );
}
