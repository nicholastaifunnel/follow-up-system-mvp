import type { Prisma, PrismaClient } from "@prisma/client";
import { mergeQueueListWhere } from "./queueListFilter";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/** Strip all non-digit characters (spaces, +, dashes, etc.). */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export type PhoneSearchLeadRow = {
  id: string;
  businessName: string;
  phone: string | null;
  internationalPhone: string | null;
  area: string | null;
  assignedIndustry: string | null;
  leadLevel: string | null;
  website: string | null;
  reviewCount: number | null;
  googleRating: number | null;
  messageStatus: string;
  replyStatus: string | null;
  replyOutcome: string | null;
  contactStatus: string;
  handoffRequired: boolean;
  nextAction: string | null;
  nextCheckAt: Date | null;
  nextFollowUpAt: Date | null;
  campaignName: string | null;
};

/**
 * Read-only: find leads whose phone-related fields contain the normalized digits
 * and/or the trimmed raw input (for DB values still holding +, spaces, dashes).
 */
export async function searchLeadsByPhone(
  prisma: PrismaClient,
  input: string,
  options?: { limit?: number; listExtraWhere?: Prisma.LeadWhereInput },
): Promise<PhoneSearchLeadRow[]> {
  const trimmed = input.trim();
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 4) {
    return [];
  }

  const rawLimit = options?.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);

  const rawForContains = trimmed.length > 0 ? trimmed : digits;
  const useRawContains =
    rawForContains.length > 0 && rawForContains !== digits;

  const orClauses = [
    { phone: { contains: digits } },
    { internationalPhone: { contains: digits } },
    { whatsappPhoneId: { contains: digits } },
  ];

  if (useRawContains) {
    orClauses.push(
      { phone: { contains: rawForContains } },
      { internationalPhone: { contains: rawForContains } },
      { whatsappPhoneId: { contains: rawForContains } },
    );
  }

  const rows = await prisma.lead.findMany({
    where: mergeQueueListWhere({ OR: orClauses }, options?.listExtraWhere),
    select: {
      id: true,
      businessName: true,
      phone: true,
      internationalPhone: true,
      area: true,
      assignedIndustry: true,
      leadLevel: true,
      website: true,
      reviewCount: true,
      googleRating: true,
      messageStatus: true,
      replyStatus: true,
      replyOutcome: true,
      contactStatus: true,
      handoffRequired: true,
      nextAction: true,
      nextCheckAt: true,
      nextFollowUpAt: true,
      campaign: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return rows.map(({ campaign, ...rest }) => ({
    ...rest,
    campaignName: campaign?.name ?? null,
  }));
}
