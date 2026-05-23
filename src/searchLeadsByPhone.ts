import type { PrismaClient } from "@prisma/client";

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
  whatsappPhone: string | null;
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
  isArchived: boolean;
  archivedReason: string | null;
  handoffRequired: boolean;
  manualNotes: string | null;
  replyNotes: string | null;
  handoffReason: string | null;
  conversationSummary: string | null;
  lastInboundMessage: string | null;
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
  options?: { limit?: number },
): Promise<PhoneSearchLeadRow[]> {
  const trimmed = input.trim();
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 4) {
    return [];
  }

  const rawLimit = options?.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);

  const rows = await prisma.lead.findMany({
    select: {
      id: true,
      businessName: true,
      phone: true,
      internationalPhone: true,
      whatsappPhone: true,
      whatsappPhoneId: true,
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
      isArchived: true,
      archivedReason: true,
      handoffRequired: true,
      manualNotes: true,
      replyNotes: true,
      handoffReason: true,
      conversationSummary: true,
      lastInboundMessage: true,
      nextAction: true,
      nextCheckAt: true,
      nextFollowUpAt: true,
      campaign: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows
    .filter((row) => {
      const candidates = [
        row.phone,
        row.internationalPhone,
        row.whatsappPhone,
        row.whatsappPhoneId,
      ].map((value) => normalizePhoneDigits(value ?? ""));

      return candidates.some((candidate) => {
        if (!candidate) return false;
        if (candidate.includes(digits)) return true;

        if (digits.startsWith("60")) {
          const local = `0${digits.slice(2)}`;
          if (local.length >= 4 && candidate.includes(local)) return true;
        }

        if (digits.startsWith("0")) {
          const international = `60${digits.slice(1)}`;
          if (international.length >= 4 && candidate.includes(international)) {
            return true;
          }
        }

        return false;
      });
    })
    .slice(0, limit)
    .map(({ campaign, whatsappPhoneId, ...rest }) => ({
      ...rest,
      campaignName: campaign?.name ?? null,
    }));
}
