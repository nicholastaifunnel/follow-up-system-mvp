import type { Prisma, PrismaClient } from "@prisma/client";
import { mytCalendarDayUtcRange } from "./formatMalaysiaTime";

const DAILY_ACTIVITY_LEAD_SELECT = {
  id: true,
  businessName: true,
  phone: true,
  internationalPhone: true,
  whatsappPhone: true,
  messageStatus: true,
  replyStatus: true,
  contactStatus: true,
  firstMessageSentAt: true,
  lastInboundMessageAt: true,
  updatedAt: true,
} as const;

type DailyActivityLeadRecord = Prisma.LeadGetPayload<{
  select: typeof DAILY_ACTIVITY_LEAD_SELECT;
}>;

export type DailyActivityLeadRow = {
  id: string;
  businessName: string;
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone: string | null;
  messageStatus: string;
  replyStatus: string | null;
  contactStatus: string | null;
  activityAt: Date;
  /** Replied rows only: counted via updatedAt because lastInboundMessageAt is missing. */
  usesReplyFallback: boolean;
};

export type DailyActivityResult = {
  activityDate: string;
  sentCount: number;
  repliedCount: number;
  replyRate: string;
  /** True when any replied row used updatedAt fallback. */
  replyUsesUpdatedAtFallback: boolean;
  sentLeads: DailyActivityLeadRow[];
  repliedLeads: DailyActivityLeadRow[];
};

function formatReplyRate(sentCount: number, repliedCount: number): string {
  if (sentCount === 0) return "—";
  const pct = (repliedCount / sentCount) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function mapSentRow(lead: DailyActivityLeadRecord): DailyActivityLeadRow {
  return {
    id: lead.id,
    businessName: lead.businessName,
    phone: lead.phone,
    internationalPhone: lead.internationalPhone,
    whatsappPhone: lead.whatsappPhone,
    messageStatus: lead.messageStatus,
    replyStatus: lead.replyStatus,
    contactStatus: lead.contactStatus,
    activityAt: lead.firstMessageSentAt!,
    usesReplyFallback: false,
  };
}

function mapRepliedRow(
  lead: DailyActivityLeadRecord,
  range: { start: Date; endExclusive: Date },
): DailyActivityLeadRow | null {
  const inbound = lead.lastInboundMessageAt;
  if (
    inbound &&
    inbound >= range.start &&
    inbound < range.endExclusive
  ) {
    return {
      id: lead.id,
      businessName: lead.businessName,
      phone: lead.phone,
      internationalPhone: lead.internationalPhone,
      whatsappPhone: lead.whatsappPhone,
      messageStatus: lead.messageStatus,
      replyStatus: lead.replyStatus,
      contactStatus: lead.contactStatus,
      activityAt: inbound,
      usesReplyFallback: false,
    };
  }

  if (lead.replyStatus !== "Replied") return null;
  if (inbound) return null;

  const updated = lead.updatedAt;
  if (updated < range.start || updated >= range.endExclusive) return null;

  return {
    id: lead.id,
    businessName: lead.businessName,
    phone: lead.phone,
    internationalPhone: lead.internationalPhone,
    whatsappPhone: lead.whatsappPhone,
    messageStatus: lead.messageStatus,
    replyStatus: lead.replyStatus,
    contactStatus: lead.contactStatus,
    activityAt: updated,
    usesReplyFallback: true,
  };
}

/**
 * Daily sent/replied stats for /queues (read-only). Calendar day is Asia/Kuala_Lumpur.
 */
export async function getDailyActivity(
  db: PrismaClient,
  activityDateIso: string,
): Promise<DailyActivityResult> {
  const range = mytCalendarDayUtcRange(activityDateIso);

  const sentWhere: Prisma.LeadWhereInput = {
    firstMessageSentAt: {
      gte: range.start,
      lt: range.endExclusive,
    },
  };

  const [sentRecords, repliedCandidates] = await Promise.all([
    db.lead.findMany({
      where: sentWhere,
      select: DAILY_ACTIVITY_LEAD_SELECT,
      orderBy: { firstMessageSentAt: "desc" },
    }),
    db.lead.findMany({
      where: {
        OR: [
          {
            lastInboundMessageAt: {
              gte: range.start,
              lt: range.endExclusive,
            },
          },
          {
            AND: [
              { replyStatus: "Replied" },
              { lastInboundMessageAt: null },
              {
                updatedAt: {
                  gte: range.start,
                  lt: range.endExclusive,
                },
              },
            ],
          },
        ],
      },
      select: DAILY_ACTIVITY_LEAD_SELECT,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const sentLeads = sentRecords.map(mapSentRow);

  const repliedById = new Map<string, DailyActivityLeadRow>();
  for (const lead of repliedCandidates) {
    const row = mapRepliedRow(lead, range);
    if (row) repliedById.set(row.id, row);
  }
  const repliedLeads = [...repliedById.values()].sort(
    (a, b) => b.activityAt.getTime() - a.activityAt.getTime(),
  );

  const sentCount = sentLeads.length;
  const repliedCount = repliedLeads.length;

  return {
    activityDate: activityDateIso,
    sentCount,
    repliedCount,
    replyRate: formatReplyRate(sentCount, repliedCount),
    replyUsesUpdatedAtFallback: repliedLeads.some((r) => r.usesReplyFallback),
    sentLeads,
    repliedLeads,
  };
}
