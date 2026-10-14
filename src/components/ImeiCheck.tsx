import { ExternalLink } from "lucide-react";
import { IMEI_CHECK_URL } from "../lib/imei";

/**
 * Un botón "Consultar en IMEIpro" por cada IMEI válido. Como la página no recibe
 * el IMEI por URL, el botón lo copia al portapapeles y la abre en otra pestaña.
 */
export default function ImeiCheck({ imeis }: { imeis: string[] }) {
  if (imeis.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {imeis.map((imei) => (
        <a
          key={imei}
          href={IMEI_CHECK_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary px-3 py-1.5 text-xs"
          title={`Copiar ${imei} y abrir imeipro.info`}
          onClick={() => navigator.clipboard?.writeText(imei).catch(() => {})}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {imeis.length > 1 ? `Consultar …${imei.slice(-6)}` : "Consultar en IMEIpro"}
        </a>
      ))}
      <span className="text-xs text-ink-400">
        Se copia el IMEI: pegalo en la página y completá el captcha.
      </span>
    </div>
  );
}
