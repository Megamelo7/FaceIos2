import { useEffect, useState } from "react";
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
  ShieldCheck,
  Truck,
  BadgeCheck,
  MessageCircle,
  Lock,
  Instagram,
  ArrowRight,
  BatteryCharging,
  Images,
  LifeBuoy,
} from "lucide-react";
import ImageViewer from "../components/ImageViewer";

/** WhatsApp de soporte técnico del sitio (distinto al de ventas de la tienda). */
const SUPPORT_WHATSAPP = "5491152577608";

// Estilo MAT en claro: fondo casi blanco, bordes negros translúcidos y botones redondeados.
const accentBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(79,70,229,0.6)] transition-colors hover:bg-brand-700";
const subtleBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B0B0F] transition-colors hover:bg-black/[0.04]";
const navLink = "font-medium text-black/60 transition-colors hover:text-black";

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
  imageUrls: string[];
  description?: string;
  featured: boolean;
  inStock: boolean;
};

function waLink(whatsapp: string, text: string) {
  const val = (whatsapp || "").trim();
  if (!val) return "";
  // Si ya es un link completo (p. ej. wa.me/qr/...), usarlo tal cual (sin prefill).
  if (val.startsWith("http")) return val;
  const clean = val.replace(/[^\d]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-black/50">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
      {children}
    </span>
  );
}

export default function Landing() {
  const products = useQuery(api.products.listPublic) as PublicProduct[] | undefined;
  const settings = useQuery(api.settings.get);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const storeName = settings?.storeName ?? "iPhone Store";
  const logo = settings?.logoUrl || "/logo.png";
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

  const consultLink = waLink(whatsapp, `Hola ${storeName}! Quería hacer una consulta.`);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#FAFAFB] text-[#0B0B0F] antialiased">
      {/* Fondo ambiental */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_42%_at_50%_-8%,rgba(99,102,241,0.14),transparent_60%),radial-gradient(40%_30%_at_85%_8%,rgba(99,102,241,0.07),transparent_70%)]" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[820px] opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(70% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 0%, black, transparent 75%)",
        }}
      />

      {/* Nav flotante */}
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
        <div
          className={`mx-auto rounded-[1.6rem] border border-black/10 bg-white/75 px-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ${
            scrolled ? "max-w-5xl py-2" : "max-w-7xl py-2.5"
          }`}
        >
          <div className="relative flex items-center justify-between gap-3">
            <a href="#top" className="shrink-0 px-1" aria-label={storeName}>
              <img src={logo} alt={storeName} className="h-10 w-auto" />
            </a>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-sm md:flex">
              <a href="#catalogo" className={`${navLink} px-3`}>Catálogo</a>
              <a href="#nosotros" className={`${navLink} px-3`}>Por qué nosotros</a>
              <a href="#contacto" className={`${navLink} px-3`}>Contacto</a>
            </nav>

            <div className="flex items-center gap-2">
              <Link to="/login" className={`${subtleBtn} px-3 py-2 text-xs sm:px-4 sm:text-sm`} title="Acceso al panel">
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Acceso</span>
              </Link>
              {consultLink && (
                <a
                  href={consultLink}
                  target="_blank"
                  rel="noreferrer"
                  className={`${accentBtn} px-3 py-2 text-xs sm:px-4 sm:text-sm`}
                >
                  Consultar
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-28 text-center sm:px-6 sm:pt-32">
          {/* El logo original es el hero. */}
          <img
            src={logo}
            alt={storeName}
            className="mx-auto h-auto w-full max-w-md animate-fade-in sm:max-w-2xl"
          />

          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-black/70 backdrop-blur-xl sm:text-sm">
            <BadgeCheck className="h-4 w-4 text-brand-600" />
            Equipos con garantía
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-black/60 sm:text-lg">
            {heroSubtitle}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#catalogo" className={`${accentBtn} px-6 py-3 text-base`}>
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </a>
            {whatsapp && (
              <a
                href={waLink(whatsapp, `Hola ${storeName}! Quería consultar precios y disponibilidad.`)}
                target="_blank"
                rel="noreferrer"
                className={`${subtleBtn} px-6 py-3 text-base`}
              >
                Consultar por WhatsApp <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
          <p className="mt-3 text-xs text-black/45">Precio y disponibilidad al instante</p>
        </div>
      </section>

      {/* Beneficios */}
      <div id="nosotros" className="relative mx-auto max-w-5xl scroll-mt-28 px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Garantía real", desc: "Todos los equipos con garantía y prueba antes de comprar." },
            { icon: BadgeCheck, title: "Calidad verificada", desc: "Nuevos, usados y reacondicionados en excelente estado." },
            { icon: Truck, title: "Entrega rápida", desc: "Coordinamos entrega en el día según tu zona." },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-3 bg-white p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-[#FAFAFB] text-brand-600">
                <b.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold tracking-[-0.01em]">{b.title}</p>
                <p className="mt-0.5 text-sm leading-6 text-black/55">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catálogo */}
      <section id="catalogo" className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <SectionEyebrow>Catálogo</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Nuestro catálogo
          </h2>
          <p className="mt-4 text-base leading-7 text-black/60">
            Consultá el precio y la disponibilidad actualizada por WhatsApp.
          </p>
        </div>

        {products === undefined ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-black/10 bg-black/[0.03]" />
            ))}
          </div>
        ) : byCategory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 py-20 text-center text-black/55">
            Todavía no hay productos publicados. Volvé pronto.
          </div>
        ) : (
          <div className="space-y-14">
            {byCategory.map(({ cat, items }) => {
              const meta = CATEGORIES[cat];
              return (
                <div key={cat}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-brand-600">
                      <meta.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-semibold tracking-[-0.02em]">{meta.plural}</h3>
                    <span className="text-sm text-black/40">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <section
          id="contacto"
          className="relative scroll-mt-28 overflow-hidden rounded-[2rem] border border-black/10 bg-white px-6 py-12 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] sm:px-10 sm:py-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]" />
          <div className="relative mx-auto max-w-2xl text-center">
            <SectionEyebrow>Contacto</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              ¿Querés saber el precio?
            </h2>
            <p className="mt-4 text-base leading-7 text-black/60">
              Escribinos y te pasamos precio, disponibilidad y formas de pago al instante.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {consultLink && (
                <a href={consultLink} target="_blank" rel="noreferrer" className={`${accentBtn} px-6 py-3 text-base`}>
                  Escribir por WhatsApp <MessageCircle className="h-4 w-4" />
                </a>
              )}
              {settings?.instagram && (
                <a
                  href={`https://instagram.com/${settings.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${subtleBtn} px-6 py-3 text-base`}
                >
                  <Instagram className="h-4 w-4" /> @{settings.instagram}
                </a>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-black/[0.08] px-4 py-10 pb-28 sm:px-6 sm:pb-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center text-sm text-black/45 sm:flex-row sm:justify-between sm:text-left">
          <img src={logo} alt={storeName} className="h-9 w-auto" />
          <p>© {new Date().getFullYear()} {storeName} · Todos los derechos reservados</p>
          <div className="flex items-center gap-4">
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
                `Hola! Necesito soporte con el sitio de ${storeName}.`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className={`${navLink} inline-flex items-center gap-1.5`}
            >
              <LifeBuoy className="h-4 w-4" /> Soporte
            </a>
            <Link to="/login" className={navLink}>Acceso al panel</Link>
          </div>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      {consultLink && (
        <a
          href={consultLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Consultar por WhatsApp"
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/90 p-3 text-sm font-medium text-[#0B0B0F] shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5 sm:bottom-5 sm:right-5 sm:px-4"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="hidden sm:block">Consultar</span>
        </a>
      )}
    </main>
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
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const mainImage = product.imageUrls[active] ?? product.imageUrls[0];
  const specs = [product.storage, product.color].filter(Boolean).join(" · ");
  const msg = `Hola ${storeName}! Me interesa el ${product.name}${
    product.storage ? ` ${product.storage}` : ""
  }. ¿Está disponible y qué precio tiene?`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-black/20 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.3)]">
      {/* Imagen: se puede abrir a pantalla completa para ver el detalle con zoom. */}
      <div className="relative aspect-[4/3] overflow-hidden bg-black/[0.03]">
        {mainImage ? (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="block h-full w-full cursor-pointer"
            aria-label={`Ver fotos de ${product.name}`}
          >
            <img
              src={mainImage}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Images className="h-3.5 w-3.5" /> Ver fotos
            </span>
          </button>
        ) : (
          <div className="flex h-full items-center justify-center text-black/15">
            <meta.icon className="h-16 w-16" />
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
          <span className={`badge ${cond.color}`}>{cond.label}</span>
          {product.featured && <span className="badge bg-brand-600 text-white">Destacado</span>}
        </div>
        {!product.inStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="badge bg-[#0B0B0F] text-white">Sin stock · Consultar</span>
          </div>
        )}
      </div>

      {zoomOpen && (
        <ImageViewer
          images={product.imageUrls}
          index={active}
          alt={product.name}
          onIndexChange={setActive}
          onClose={() => setZoomOpen(false)}
        />
      )}

      {/* Miniaturas (cuando hay varias fotos) */}
      {product.imageUrls.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 pt-3">
          {product.imageUrls.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === active ? "border-brand-500" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              aria-label={`Foto ${i + 1}`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="flex flex-1 flex-col p-5">
        <h4 className="font-semibold tracking-[-0.01em]">{product.name}</h4>
        {specs && <p className="mt-0.5 text-sm text-black/55">{specs}</p>}
        {(product.batteryHealth || product.batteryType) && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-black/45">
            <BatteryCharging className="h-3.5 w-3.5" />
            {product.batteryHealth ? `Batería ${product.batteryHealth}%` : "Batería"}
            {product.batteryType
              ? ` · ${product.batteryType === "original" ? "original" : "reacondicionada"}`
              : ""}
          </p>
        )}
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/55">{product.description}</p>
        )}
        <div className="mt-4 flex-1" />
        <a href={waLink(whatsapp, msg)} target="_blank" rel="noreferrer" className={`${subtleBtn} w-full`}>
          <MessageCircle className="h-4 w-4" /> Consultar precio
        </a>
      </div>
    </article>
  );
}
