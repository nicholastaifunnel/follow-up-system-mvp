import type { Prisma, PrismaClient } from "@prisma/client";
import { mergeQueueListWhere } from "./queueListFilter";
import { normalizePhoneDigits } from "./searchLeadsByPhone";
import {
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
} from "./statusConstants";

const OUTREACH_READY = "Ready";

export type FilteredMessageLeadRow = {
  id: string;
  businessName: string;
  phone: string | null;
  internationalPhone: string | null;
  website: string | null;
  reviewCount: number | null;
  googleRating: number | null;
  messageStatus: string;
  replyStatus: string | null;
};

export type GetFilteredMessageLeadsOptions = {
  limit?: number;
  listExtraWhere?: Prisma.LeadWhereInput;
  /** When set and has ≥4 digits, AND phone match (same rules as phone search). */
  phoneQuery?: string;
};

/**
 * Top /queues “Filtered Message Leads” only: cold outreach still actionable.
 * Matches Not Prepared + Prepared Not Sent buckets — not sent / replied / handoff.
 */
function coldOutreachFilteredWhere(): Prisma.LeadWhereInput {
  return {
    isArchived: false,
    skippedAt: null,
    handoffRequired: false,
    AND: [
      {
        OR: [
          {
            messageStatus: MESSAGE_STATUS_NOT_PREPARED,
            outreachReadiness: OUTREACH_READY,
          },
          { messageStatus: MESSAGE_STATUS_PREPARED },
        ],
      },
      // Allow-list: SQLite/Prisma `NOT: { replyStatus: "…" }` wrongly drops null rows.
      {
        OR: [{ replyStatus: null }, { replyStatus: "No Reply Yet" }],
      },
    ],
  };
}

function phoneMatchWhere(input: string): Prisma.LeadWhereInput | undefined {
  const trimmed = input.trim();
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 4) return undefined;

  const rawForContains = trimmed.length > 0 ? trimmed : digits;
  const useRawContains =
    rawForContains.length > 0 && rawForContains !== digits;

  const orClauses: Prisma.LeadWhereInput[] = [
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
  return { OR: orClauses };
}

/**
 * Single-query list of cold-outreach-actionable leads (Not Prepared or Prepared,
 * not yet first-sent / waiting / replied / handoff), with optional angle/review/phone
 * filters (reuses queueListFilter merge). Read-only.
 */
export async function getFilteredMessageLeads(
  db: PrismaClient,
  options?: GetFilteredMessageLeadsOptions,
): Promise<FilteredMessageLeadRow[]> {
  const raw = options?.limit ?? 10;
  const limit = Number.isFinite(raw)
    ? Math.min(500, Math.max(1, Math.floor(raw)))
    : 10;

  let where: Prisma.LeadWhereInput = coldOutreachFilteredWhere();
  where = mergeQueueListWhere(where, options?.listExtraWhere);

  const phoneQ = options?.phoneQuery?.trim();
  if (phoneQ) {
    const phoneWhere = phoneMatchWhere(phoneQ);
    if (phoneWhere) {
      where = mergeQueueListWhere(where, phoneWhere);
    }
  }

  const rows = await db.lead.findMany({
    where,
    select: {
      id: true,
      businessName: true,
      phone: true,
      internationalPhone: true,
      website: true,
      reviewCount: true,
      googleRating: true,
      messageStatus: true,
      replyStatus: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
  });

  return rows;
}
