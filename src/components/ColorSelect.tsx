import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { ColorDot } from "./ui";

export type ColorOption = {
  value: string;
  label: string;
  /** Nombre del color para el circulito (sin él, la opción va sin circulito). */
  color?: string;
  /** Opciones especiales ("Elegí un color", "Otro…") en gris. */
  muted?: boolean;
};

type Position = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

/**
 * Combo de colores con el circulito de cada opción (un <select> nativo no
 * puede dibujarlo). La lista se abre en un portal para que no la recorte el
 * scroll del modal; se maneja con flechas, Enter y Escape.
 */
export default function ColorSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ColorOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = options.find((o) => o.value === value);

  function place() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < 220 && above > below;
    setPos({
      left: r.left,
      width: r.width,
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      maxHeight: Math.min(280, up ? above : below),
    });
  }

  function openList() {
    place();
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(i: number) {
    onChange(options[i].value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Mantiene visible la opción activa al moverse con el teclado.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      // Que no cierre también el modal.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="input flex items-center gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {selected?.color && <ColorDot color={selected.color} className="h-3.5 w-3.5 ring-ink-400/60" />}
        <span className={`flex-1 truncate ${!selected || selected.muted ? "text-ink-400" : ""}`}>
          {selected?.label ?? value}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            className="fixed z-[60] overflow-y-auto rounded-xl border border-ink-200 bg-surface py-1 shadow-card-lg animate-fade-in"
            style={pos}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm ${
                  i === active ? "bg-ink-100" : ""
                } ${o.muted ? "text-ink-400" : "text-ink-900"}`}
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <ColorDot color={o.color} className="h-3.5 w-3.5 ring-ink-400/60" />
                </span>
                <span className="flex-1 truncate">{o.label}</span>
                {o.value === value && !o.muted && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
