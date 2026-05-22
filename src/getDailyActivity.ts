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
};

export type DailyActivityResult = {
  activityDate: string;
  sentCount: number;
  repliedCount: number;
  replyRate: string;
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
  };
}

/** Cohort replied row: first sent on selected date; display latest reply time when known. */
function mapCohortRepliedRow(lead: DailyActivityLeadRecord): DailyActivityLeadRow {
  const repliedAt = lead.lastInboundMessageAt ?? lead.updatedAt;
  return {
    id: lead.id,
    businessName: lead.businessName,
    phone: lead.phone,
    internationalPhone: lead.internationalPhone,
    whatsappPhone: lead.whatsappPhone,
    messageStatus: lead.messageStatus,
    replyStatus: lead.replyStatus,
    contactStatus: lead.contactStatus,
    activityAt: repliedAt,
  };
}

/**
 * Daily cohort stats for /queues (read-only).
 * Selected date = first message sent date (MYT). Replies count back to that send cohort.
 */
export async function getDailyActivity(
  db: PrismaClient,
  activityDateIso: string,
): Promise<DailyActivityResult> {
  const range = mytCalendarDayUtcRange(activityDateIso);

  const sentRecords = await db.lead.findMany({
    where: {
      firstMessageSentAt: {
        gte: range.start,
        lt: range.endExclusive,
      },
    },
    select: DAILY_ACTIVITY_LEAD_SELECT,
    orderBy: { firstMessageSentAt: "desc" },
  });

  const sentLeads = sentRecords.map(mapSentRow);

  const repliedLeads = sentRecords
    .filter((lead) => lead.replyStatus === "Replied")
    .map(mapCohortRepliedRow)
    .sort((a, b) => b.activityAt.getTime() - a.activityAt.getTime());

  const sentCount = sentLeads.length;
  const repliedCount = repliedLeads.length;

  return {
    activityDate: activityDateIso,
    sentCount,
    repliedCount,
    replyRate: formatReplyRate(sentCount, repliedCount),
    sentLeads,
    repliedLeads,
  };
}
