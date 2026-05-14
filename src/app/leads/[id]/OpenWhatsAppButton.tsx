"use client";

import { digitsForWaMe } from "@/lib/digitsForWaMe";

type Props = {
  phone: string | null;
  internationalPhone: string | null;
  preparedMessage: string | null;
};

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
