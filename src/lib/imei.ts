/** Formato de IMEI: exactamente 15 dígitos (sin validar dígito verificador). */
export const IMEI_LENGTH = 15;

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
