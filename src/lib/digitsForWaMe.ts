/**
 * Builds wa.me digits: prefer internationalPhone, else phone; digits only.
 * Malaysia local mobiles (01x…) → 60 + rest after dropping leading 0.
 */
export function digitsForWaMe(
  phone: string | null,
  internationalPhone: string | null,
): string | null {
  const raw =
    (internationalPhone?.trim() ?? "") || (phone?.trim() ?? "");
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("60")) {
    return d;
  }
  if (d.startsWith("0") && d.charAt(1) === "1" && d.length >= 9) {
    return `60${d.slice(1)}`;
  }
  return d;
}

export function buildWhatsAppMeUrl(
  phone: string | null,
  internationalPhone: string | null,
  text: string,
): string | null {
  const digits = digitsForWaMe(phone, internationalPhone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
