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
const DEFAULT_LOGO = "/logo.png";

// Estilo MAT: fondo casi negro, bordes blancos translúcidos y botones redondeados.
const accentBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_34px_-10px_rgba(99,102,241,0.7)] transition-colors hover:bg-brand-600";
const subtleBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.09]";
const navLink = "font-medium text-white/60 transition-colors hover:text-white";

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

/**
 * El logo por defecto es negro sobre fondo blanco (opaco): invertido queda
 * blanco sobre negro, y `mix-blend-screen` hace desaparecer el negro contra el
 * fondo oscuro. Un logo propio (Ajustes) va sobre una placa blanca para no
 * alterar sus colores.
 */
function StoreLogo({ src, alt, className }: { src: string; alt: string; className: string }) {
  if (src === DEFAULT_LOGO) {
    return <img src={src} alt={alt} className={`${className} invert mix-blend-screen`} />;
  }
  return (
    <span className="inline-flex rounded-xl bg-white px-2 py-1">
      <img src={src} alt={alt} className={className} />
    </span>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-white/50">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
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
  const logo = settings?.logoUrl || DEFAULT_LOGO;
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
    <main className="relative min-h-screen overflow-x-hidden bg-[#08080A] text-white antialiased">
      {/* Fondo ambiental */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_42%_at_50%_-8%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(40%_30%_at_85%_8%,rgba(99,102,241,0.08),transparent_70%)]" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[820px] opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(70% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 0%, black, transparent 75%)",
        }}
      />

      {/* Nav flotante */}
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
        <div
          className={`mx-auto rounded-[1.6rem] border border-white/10 bg-[#0B0B0D]/70 px-4 shadow-[0_14px_36px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 ${
            scrolled ? "max-w-5xl py-2.5" : "max-w-7xl py-3"
          }`}
        >
          <div className="relative flex items-center justify-between gap-3">
            <a href="#top" className="shrink-0 px-2" aria-label={storeName}>
              <StoreLogo src={logo} alt={storeName} className="h-8 w-auto" />
            </a>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm md:flex">
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
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-28 text-center sm:px-6 sm:pt-36">
          <StoreLogo
            src={logo}
            alt={storeName}
            className="mx-auto h-auto w-full max-w-xs animate-fade-in sm:max-w-md"
          />

          <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs text-white/70 backdrop-blur-xl sm:text-sm">
            <BadgeCheck className="h-4 w-4 text-brand-400" />
            Equipos con garantía
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-white/60 sm:text-lg">
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
          <p className="mt-3 text-xs text-white/45">Precio y disponibilidad al instante</p>
        </div>
      </section>

      {/* Beneficios */}
      <div id="nosotros" className="relative mx-auto max-w-5xl scroll-mt-28 px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Garantía real", desc: "Todos los equipos con garantía y prueba antes de comprar." },
            { icon: BadgeCheck, title: "Calidad verificada", desc: "Nuevos, usados y reacondicionados en excelente estado." },
            { icon: Truck, title: "Entrega rápida", desc: "Coordinamos entrega en el día según tu zona." },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-3 bg-[#0A0A0C] p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-brand-400">
                <b.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold tracking-[-0.01em]">{b.title}</p>
                <p className="mt-0.5 text-sm leading-6 text-white/55">{b.desc}</p>
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
          <p className="mt-4 text-base leading-7 text-white/60">
            Consultá el precio y la disponibilidad actualizada por WhatsApp.
          </p>
        </div>

        {products === undefined ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        ) : byCategory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 py-20 text-center text-white/55">
            Todavía no hay productos publicados. Volvé pronto.
          </div>
        ) : (
          <div className="space-y-14">
            {byCategory.map(({ cat, items }) => {
              const meta = CATEGORIES[cat];
              return (
                <div key={cat}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-brand-400">
                      <meta.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-semibold tracking-[-0.02em]">{meta.plural}</h3>
                    <span className="text-sm text-white/40">{items.length}</span>
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
          className="relative scroll-mt-28 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0C0C0E] px-6 py-12 sm:px-10 sm:py-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgba(99,102,241,0.18),transparent_70%)]" />
          <div className="relative mx-auto max-w-2xl text-center">
            <SectionEyebrow>Contacto</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              ¿Querés saber el precio?
            </h2>
            <p className="mt-4 text-base leading-7 text-white/65">
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
      <footer className="relative border-t border-white/[0.08] px-4 py-10 pb-28 sm:px-6 sm:pb-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center text-sm text-white/45 sm:flex-row sm:justify-between sm:text-left">
          <StoreLogo src={logo} alt={storeName} className="h-7 w-auto opacity-90" />
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
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-3 rounded-full border border-white/12 bg-[#121214]/90 p-3 text-sm font-medium text-white shadow-[0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5 sm:bottom-5 sm:right-5 sm:px-4"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white">
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
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] transition-colors hover:border-white/20 hover:bg-white/[0.04]">
      {/* Imagen: se puede abrir a pantalla completa para ver el detalle con zoom. */}
      <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.03]">
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
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Images className="h-3.5 w-3.5" /> Ver fotos
            </span>
          </button>
        ) : (
          <div className="flex h-full items-center justify-center text-white/20">
            <meta.icon className="h-16 w-16" />
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
          <span className={`badge ${cond.color}`}>{cond.label}</span>
          {product.featured && <span className="badge bg-brand-500 text-white">Destacado</span>}
        </div>
        {!product.inStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
            <span className="badge border border-white/15 bg-white/10 text-white">Sin stock · Consultar</span>
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
                i === active ? "border-brand-400" : "border-transparent opacity-60 hover:opacity-100"
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
        {specs && <p className="mt-0.5 text-sm text-white/55">{specs}</p>}
        {(product.batteryHealth || product.batteryType) && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/45">
            <BatteryCharging className="h-3.5 w-3.5" />
            {product.batteryHealth ? `Batería ${product.batteryHealth}%` : "Batería"}
            {product.batteryType
              ? ` · ${product.batteryType === "original" ? "original" : "reacondicionada"}`
              : ""}
          </p>
        )}
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">{product.description}</p>
        )}
        <div className="mt-4 flex-1" />
        <a href={waLink(whatsapp, msg)} target="_blank" rel="noreferrer" className={`${subtleBtn} w-full`}>
          <MessageCircle className="h-4 w-4" /> Consultar precio
        </a>
      </div>
    </article>
  );
}
