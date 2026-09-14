import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

/** Misma clave que lee el script de index.html para evitar el parpadeo. */
const KEY = "faceios2-theme";
const listeners = new Set<() => void>();

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage bloqueado: se usa el tema del sistema.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let current: Theme = initialTheme();

function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Sin persistencia: el cambio vale para esta pestaña.
  }
  listeners.forEach((l) => l());
}

/** Tema claro/oscuro del panel (arranca con el del sistema, recuerda la elección). */
export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => current,
  );
  return {
    theme,
    isDark: theme === "dark",
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
