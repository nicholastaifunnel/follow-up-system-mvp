import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizePhoneDigits } from "./searchLeadsByPhone";

export function normalizeWhatsAppInput(raw: string): {
  digits: string;
  whatsappPhone: string;
  phone: string | null;
  internationalPhone: string | null;
} | null {
  const trimmed = raw.trim();
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 8) return null;

  let internationalPhone: string | null = null;
  let phone: string | null = trimmed || null;

  if (digits.startsWith("60") && digits.length >= 10) {
    internationalPhone = `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.charAt(2) === "1") {
      phone = `0${digits.slice(2)}`;
    }
  } else if (digits.startsWith("0")) {
    phone = digits;
    if (digits.charAt(1) === "1" && digits.length >= 9) {
      internationalPhone = `+60 ${digits.slice(1)}`;
    }
  }

  return {
    digits,
    whatsappPhone: trimmed,
    phone,
    internationalPhone,
  };
}

export async function findLeadByWhatsAppDigits(
  db: PrismaClient,
  digits: string,
): Promise<{ id: string } | null> {
  if (digits.length < 8) return null;

  const rows = await db.lead.findMany({
    where: {
      OR: [
        { whatsappPhone: { not: null } },
        { phone: { not: null } },
        { internationalPhone: { not: null } },
      ],
    },
    select: {
      id: true,
      whatsappPhone: true,
      phone: true,
      internationalPhone: true,
    },
    take: 500,
    orderBy: { updatedAt: "desc" },
  });

  for (const row of rows) {
    const fields = [row.whatsappPhone, row.phone, row.internationalPhone];
    for (const f of fields) {
      if (!f) continue;
      const d = normalizePhoneDigits(f);
      if (d === digits || d.endsWith(digits) || digits.endsWith(d)) {
        return { id: row.id };
      }
    }
  }

  return null;
}

export function adTrialColdExclusionWhere(): Prisma.LeadWhereInput {
  return { trialRequestedAt: null };
}
