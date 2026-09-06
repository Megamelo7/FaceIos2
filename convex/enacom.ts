"use node";
import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Consulta oficial de IMEI en ENACOM (https://imei.enacom.gob.ar/).
 *
 * La página es una app Laravel Livewire v3 sin CAPTCHA. Replicamos su
 * protocolo: GET (cookies + token CSRF + snapshot del componente) y luego
 * POST /livewire/update llamando al método `consultar` con el IMEI.
 * La respuesta trae el resultado estructurado en `data.resultado`.
 */

const BASE = "https://imei.enacom.gob.ar";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FaceIos2/1.0";

const unescapeHtml = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Cookies del GET inicial (soporta runtimes sin `getSetCookie`). */
function setCookies(h: Headers): string[] {
  const anyH = h as unknown as { getSetCookie?: () => string[] };
  if (typeof anyH.getSetCookie === "function") return anyH.getSetCookie();
  const raw = h.get("set-cookie") ?? "";
  return raw ? raw.split(/,\s*(?=[A-Za-z0-9_-]+=)/) : [];
}

/** Livewire v3 serializa arrays como [valor, {"s":"arr"}]. */
function unwrap(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export type ImeiCheckResult = {
  status: "valido" | "bloqueado" | "error";
  title: string;
  message: string;
  gsma?: string;
  code?: string;
  imei: string;
  checkedAt: number;
};

export const checkImei = action({
  args: { imei: v.string() },
  handler: async (ctx, args): Promise<ImeiCheckResult> => {
    const me = await getAuthUserId(ctx);
    if (me === null) throw new ConvexError("No autorizado.");

    const imei = args.imei.replace(/\D/g, "");
    if (imei.length < 14 || imei.length > 15) {
      throw new ConvexError("El IMEI debe tener 15 dígitos (marcá *#06# en el equipo).");
    }

    // 1) GET: cookies + CSRF + snapshot del componente Livewire.
    let r1: Response;
    try {
      r1 = await fetch(`${BASE}/`, { headers: { "User-Agent": UA, Accept: "text/html" } });
    } catch {
      throw new ConvexError("No se pudo conectar con ENACOM. Probá de nuevo en unos segundos.");
    }
    const html = await r1.text();
    const cookies = setCookies(r1.headers)
      .map((c) => c.split(";")[0])
      .join("; ");
    const csrf = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];
    const snapRaw = html.match(/wire:snapshot="([^"]+)"/)?.[1];
    if (!csrf || !snapRaw) {
      throw new ConvexError("ENACOM cambió su página y no se pudo consultar automáticamente.");
    }

    // 2) POST /livewire/update → método `consultar` con el IMEI.
    const r2 = await fetch(`${BASE}/livewire/update`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Livewire": "true",
        "X-CSRF-TOKEN": csrf,
        Cookie: cookies,
        Referer: `${BASE}/`,
        Origin: BASE,
      },
      body: JSON.stringify({
        _token: csrf,
        components: [
          {
            snapshot: unescapeHtml(snapRaw),
            updates: { imei },
            calls: [{ path: "", method: "consultar", params: [] }],
          },
        ],
      }),
    });
    if (!r2.ok) throw new ConvexError(`ENACOM respondió con error ${r2.status}. Probá de nuevo.`);

    const json = (await r2.json()) as { components?: { snapshot?: string }[] };
    const snap = json.components?.[0]?.snapshot;
    if (!snap) throw new ConvexError("Respuesta inesperada de ENACOM.");
    const data = (JSON.parse(snap) as { data: { resultado?: unknown; error?: unknown } }).data;
    const now = Date.now();

    const error = unwrap(data.error);
    if (error) {
      return {
        status: "error",
        title: "No se pudo verificar",
        message: typeof error === "string" ? error : JSON.stringify(error),
        imei,
        checkedAt: now,
      };
    }

    const res = unwrap(data.resultado) as Record<string, unknown> | null | undefined;
    if (!res || typeof res !== "object") {
      return {
        status: "error",
        title: "Sin resultado",
        message: "ENACOM no devolvió información para este IMEI.",
        imei,
        checkedAt: now,
      };
    }

    const bloqueado = String(res.bloqueado ?? "").toUpperCase() === "SI";
    return {
      status: bloqueado ? "bloqueado" : "valido",
      title: bloqueado ? "IMEI Bloqueado" : "IMEI Válido",
      message: String(
        res.mensaje ??
          (bloqueado ? "No podrás usar el equipo." : "Podés usar el equipo sin problemas."),
      ),
      gsma: res.gsmaStatus ? String(res.gsmaStatus) : undefined,
      code: res.codigo_error ? String(res.codigo_error) : undefined,
      imei,
      checkedAt: now,
    };
  },
});
