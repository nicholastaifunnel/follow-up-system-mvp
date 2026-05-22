"use client";

import { digitsForWaMe } from "@/lib/digitsForWaMe";

type Props = {
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone?: string | null;
  preparedMessage: string | null;
  label?: string;
};

export function OpenWhatsAppButton({
  phone,
  internationalPhone,
  whatsappPhone,
  preparedMessage,
  label = "Open WhatsApp with draft",
}: Props) {
  const prepared = (preparedMessage ?? "").trim();
  const digits = digitsForWaMe(phone, internationalPhone, whatsappPhone);

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
      {label}
    </a>
  );
}
