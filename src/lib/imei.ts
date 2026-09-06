/** Validación local de IMEI (15 dígitos + dígito verificador Luhn). */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** true si el texto contiene un IMEI de 15 dígitos con dígito verificador correcto. */
export function isValidImei(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length === 15 && luhnValid(digits);
}
