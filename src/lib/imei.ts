/** Formato de IMEI: exactamente 15 dígitos (sin validar dígito verificador). */
export const IMEI_LENGTH = 15;

/**
 * Consulta de IMEI de Apple en imeipro.info. La página no toma el IMEI por URL
 * y pide un captcha: se abre vacía y el IMEI se pega a mano.
 */
export const IMEI_CHECK_URL = "https://www.imeipro.info/check_imei_iphone.html";

export function normalizeImei(input: string): string {
  return input.replace(/\D/g, "");
}

export function isImeiFormat(input: string): boolean {
  return normalizeImei(input).length === IMEI_LENGTH;
}

/**
 * Extrae varios IMEIs de un texto libre (separados por coma, espacio, salto de
 * línea o cualquier otro carácter no numérico). No valida el largo: eso lo
 * decide quien lo muestra, para poder marcar los incorrectos.
 */
export function parseImeis(text: string): string[] {
  return text.split(/[^\d]+/).filter(Boolean);
}
