/**
 * Normalizes a Turkish phone number to a canonical 10-digit local format (e.g. 5XXXXXXXXX).
 * Handles: +905..., 905..., 05..., 5...
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('90')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}
