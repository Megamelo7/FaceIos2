/**
 * Color aproximado de cada acabado de Apple, para el circulito al lado del
 * nombre. Se compara sin tildes ni mayúsculas; si el nombre no está en la
 * lista (p. ej. uno cargado a mano) se busca por palabra clave.
 */

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const EXACT: Record<string, string> = {
  plata: "#e3e4e5",
  "gris espacial": "#6e6e73",
  "blanco estelar": "#f0e9df",
  azul: "#5b8dc9",
  blanco: "#f5f5f0",
  purpura: "#c3b5db",
  "negro espacial": "#3a3a3c",
  negro: "#1f2020",
  medianoche: "#232a31",
  rosa: "#f2c9d0",
  verde: "#9dbf9a",
  oro: "#f1dfc0",
  "(product)red": "#ba0c2f",
  amarillo: "#f6e27f",
  "azul cielo": "#c9dcea",
  "titanio negro": "#3c3c3d",
  "titanio natural": "#bab4a9",
  "titanio blanco": "#f2f1ed",
  "titanio desierto": "#bfa48f",
  "titanio azul": "#2f4452",
  grafito: "#52514d",
  "verde noche": "#4e5851",
  "verde azulado": "#a6cfcb",
  "verde alpino": "#576856",
  ultramarino: "#9aadf6",
  "naranja cosmico": "#e9752f",
  "morado oscuro": "#594f63",
  glaciar: "#cfdde3",
  borgona: "#6d1f2e",
  "azul profundo": "#2e3a4f",
  "azul pacifico": "#2d4e5c",
  "azul sierra": "#9bb5ce",
  salvia: "#a9b89c",
  "oro rosa": "#e6c7c2",
  naranja: "#f2a27b",
  lavanda: "#cdbbdd",
  "dorado claro": "#ebddc3",
  "cielo nocturno": "#1e2a44",
  "blanco nube": "#f4f3ef",
  "blanco estrella": "#f3f1ec",
  "azul niebla": "#a9bcd0",
};

/** Palabras clave (en orden de prioridad) para nombres que no están en la lista. */
const KEYWORDS: [RegExp, string][] = [
  [/medianoche|midnight/, "#232a31"],
  [/grafito|graphite/, "#52514d"],
  [/negro|black/, "#1f2020"],
  [/blanco|white|estelar|starlight/, "#f5f5f0"],
  [/gris|gray|grey/, "#6e6e73"],
  [/plata|plateado|silver/, "#e3e4e5"],
  [/red|rojo/, "#ba0c2f"],
  [/celeste|cielo|sky/, "#c9dcea"],
  [/azul|blue/, "#5b8dc9"],
  [/verde|green|teal/, "#9dbf9a"],
  [/rosa|pink/, "#f2c9d0"],
  [/amarillo|yellow/, "#f6e27f"],
  [/oro|dorado|gold/, "#f1dfc0"],
  [/purpura|morado|violeta|lila|lavanda|purple/, "#c3b5db"],
  [/naranja|orange/, "#f2a27b"],
  [/titanio|titanium/, "#bab4a9"],
  [/marron|cafe|brown/, "#7b5b45"],
  [/beige|crema/, "#efe4d0"],
];

/** Hex del color del equipo, o `null` si el nombre no se reconoce. */
export function deviceColorHex(name?: string | null): string | null {
  if (!name) return null;
  const n = norm(name);
  if (EXACT[n]) return EXACT[n];
  return KEYWORDS.find(([re]) => re.test(n))?.[1] ?? null;
}
