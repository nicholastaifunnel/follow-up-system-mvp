"use client";

type Props = {
  phone: string | null;
  internationalPhone: string | null;
  preparedMessage: string | null;
};

/**
 * Builds wa.me digits: prefer internationalPhone, else phone; digits only.
 * Malaysia local mobiles (01x…) → 60 + rest after dropping leading 0.
 */
function digitsForWaMe(
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

export function OpenWhatsAppButton({
  phone,
  internationalPhone,
  preparedMessage,
}: Props) {
  const prepared = (preparedMessage ?? "").trim();
  const digits = digitsForWaMe(phone, internationalPhone);

  if (!prepared) {
    return (
      <span className="open-whatsapp-hint">
        Prepare a draft first.
      </span>
    );
  }

  if (!digits) {
    return (
      <span className="open-whatsapp-hint">
        No usable phone for WhatsApp.
      </span>
    );
  }

  const href = `https://wa.me/${digits}?text=${encodeURIComponent(prepared)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="open-whatsapp-btn open-whatsapp-btn-primary"
    >
      Open WhatsApp with draft
    </a>
  );
}
