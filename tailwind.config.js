import colors from "tailwindcss/colors";
import plugin from "tailwindcss/plugin";

/**
 * Modo oscuro: los colores `ink`, `surface` y los tonos suaves de estado
 * (50/100/200 y textos 600-800) salen de variables CSS que se invierten con
 * la clase `.dark` en <html>. `.ink-light` fija los valores claros (sidebar).
 */
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const ink = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
  950: "#020617",
};
const inkDark = {
  50: "#131c2e",
  100: "#0b1220",
  200: "#243044",
  300: "#334155",
  400: "#7d8ba1",
  500: "#94a3b8",
  600: "#b4c0d0",
  700: "#cbd5e1",
  800: "#e2e8f0",
  900: "#f1f5f9",
  950: "#f8fafc",
};

const brand = {
  50: "#eef2ff",
  100: "#e0e7ff",
  200: "#c7d2fe",
  300: "#a5b4fc",
  400: "#818cf8",
  500: "#6366f1",
  600: "#4f46e5",
  700: "#4338ca",
  800: "#3730a3",
  900: "#312e81",
  950: "#1e1b4b",
};

// Tono claro → tono que lo reemplaza en oscuro.
const TINT_DARK = { 50: 950, 100: 900, 200: 800, 600: 400, 700: 300, 800: 200 };
const TINTED = { red: colors.red, emerald: colors.emerald, amber: colors.amber, sky: colors.sky, violet: colors.violet, orange: colors.orange, slate: colors.slate, teal: colors.teal };

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${n >> 16} ${(n >> 8) & 255} ${n & 255}`;
};
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

const lightVars = { "--c-surface": rgb("#ffffff") };
const darkVars = { "--c-surface": rgb("#151f32") };
const inkLightVars = {};

const inkColors = {};
for (const s of STEPS) {
  inkColors[s] = token(`ink-${s}`);
  lightVars[`--c-ink-${s}`] = rgb(ink[s]);
  darkVars[`--c-ink-${s}`] = rgb(inkDark[s]);
  inkLightVars[`--c-ink-${s}`] = rgb(ink[s]);
}

const brandColors = { ...brand };
const tintedColors = {};
for (const [s, d] of Object.entries(TINT_DARK)) {
  if (s !== "600") {
    brandColors[s] = token(`brand-${s}`);
    lightVars[`--c-brand-${s}`] = rgb(brand[s]);
    darkVars[`--c-brand-${s}`] = rgb(brand[d]);
  }
  for (const [name, palette] of Object.entries(TINTED)) {
    tintedColors[name] ??= {};
    tintedColors[name][s] = token(`${name}-${s}`);
    lightVars[`--c-${name}-${s}`] = rgb(palette[s]);
    darkVars[`--c-${name}-${s}`] = rgb(palette[d]);
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        brand: brandColors,
        ink: inkColors,
        surface: token("surface"),
        ...tintedColors,
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-lg": "0 10px 30px -12px rgb(2 6 23 / 0.25)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ":root": lightVars, ".dark": darkVars, ".ink-light": inkLightVars });
    }),
  ],
};
