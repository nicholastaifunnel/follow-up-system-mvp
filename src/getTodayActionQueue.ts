import type { Prisma, PrismaClient } from "@prisma/client";
import { mergeQueueListWhere } from "./queueListFilter";
import {
  MESSAGE_STATUS_FIRST_SENT,
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
} from "./statusConstants";
import { LEAD_REVIEW_APPROVED } from "./leadReviewStatus";
import { withActiveOutreachWhere } from "./doNotContact";

export type TodayActionLeadRow = {
  id: string;
  businessName: string;
  assignedIndustry: string | null;
  leadLevel: string | null;
  website: string | null;
  reviewCount: number | null;
  googleRating: number | null;
  outreachReadiness: string | null;
  messageStatus: string;
  replyStatus: string | null;
  contactStatus: string;
  phone: string | null;
  internationalPhone: string | null;
  area: string | null;
  nextCheckAt: Date | null;
  nextFollowUpAt: Date | null;
  nextAction: string | null;
  campaignName: string | null;
};

export type TodayActionQueueGroup = {
  count: number;
  leads: TodayActionLeadRow[];
};

export type TodayActionQueueResult = {
  prepareFirstMessage: TodayActionQueueGroup;
  sendPreparedMessage: TodayActionQueueGroup;
  firstFollowUpDue: TodayActionQueueGroup;
  secondFollowUpDue: TodayActionQueueGroup;
  needHumanReply: TodayActionQueueGroup;
};

export type GetTodayActionQueueOptions = {
  limit?: number;
  listExtraWhere?: Prisma.LeadWhereInput;
};

const leadSelect = {
  id: true,
  businessName: true,
  assignedIndustry: true,
  leadLevel: true,
  website: true,
  reviewCount: true,
  googleRating: true,
  outreachReadiness: true,
  messageStatus: true,
  replyStatus: true,
  contactStatus: true,
  phone: true,
  internationalPhone: true,
  area: true,
  nextCheckAt: true,
  nextFollowUpAt: true,
  nextAction: true,
  campaign: { select: { name: true } },
} satisfies Prisma.LeadSelect;

type LeadRecord = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

function toRow(lead: LeadRecord): TodayActionLeadRow {
  return {
    id: lead.id,
    businessName: lead.businessName,
    assignedIndustry: lead.assignedIndustry,
    leadLevel: lead.leadLevel,
    website: lead.website,
    reviewCount: lead.reviewCount,
    googleRating: lead.googleRating,
    outreachReadiness: lead.outreachReadiness,
    messageStatus: lead.messageStatus,
    replyStatus: lead.replyStatus,
    contactStatus: lead.contactStatus,
    phone: lead.phone,
    internationalPhone: lead.internationalPhone,
    area: lead.area,
    nextCheckAt: lead.nextCheckAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    nextAction: lead.nextAction,
    campaignName: lead.campaign?.name ?? null,
  };
}

async function loadGroup(
  db: PrismaClient,
  where: Prisma.LeadWhereInput,
  limit: number,
  listExtraWhere?: Prisma.LeadWhereInput,
  orderBy: Prisma.LeadOrderByWithRelationInput[] = [{ updatedAt: "desc" }],
): Promise<TodayActionQueueGroup> {
  const merged = mergeQueueListWhere(where, listExtraWhere);
  const [count, rows] = await Promise.all([
    db.lead.count({ where: merged }),
    db.lead.findMany({
      where: merged,
      select: leadSelect,
      orderBy,
      take: limit,
    }),
  ]);

  return {
    count,
    leads: rows.map(toRow),
  };
}

/** Leads awaiting outbound follow-up (not monitoring / not deferred). */
function followUpDueBase(now: Date): Prisma.LeadWhereInput {
  return {
    messageStatus: MESSAGE_STATUS_FIRST_SENT,
    replyStatus: { not: "Replied" },
    handoffRequired: false,
    contactStatus: { not: "Follow Up" },
    AND: [{ nextFollowUpAt: { not: null } }, { nextFollowUpAt: { lte: now } }],
  };
}

/**
 * Read-only action-needed queues for /queues (Today’s Action Queue).
 * First/second follow-up due use followUp1SentAt / followUp2SentAt (set via queue mark actions).
 */
export async function getTodayActionQueue(
  db: PrismaClient,
  options?: GetTodayActionQueueOptions,
): Promise<TodayActionQueueResult> {
  const raw = options?.limit ?? 10;
  const limit = Number.isFinite(raw)
    ? Math.min(500, Math.max(1, Math.floor(raw)))
    : 10;

  const extra = options?.listExtraWhere;
  const now = new Date();

  const [
    prepareFirstMessage,
    sendPreparedMessage,
    firstFollowUpDue,
    secondFollowUpDue,
    needHumanReply,
  ] = await Promise.all([
    loadGroup(
      db,
      withActiveOutreachWhere({
        messageStatus: MESSAGE_STATUS_NOT_PREPARED,
        outreachReadiness: LEAD_REVIEW_APPROVED,
      }),
      limit,
      extra,
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        messageStatus: MESSAGE_STATUS_PREPARED,
        outreachReadiness: LEAD_REVIEW_APPROVED,
      }),
      limit,
      extra,
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        ...followUpDueBase(now),
        followUp1SentAt: null,
      }),
      limit,
      extra,
      [{ nextFollowUpAt: "asc" }],
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        ...followUpDueBase(now),
        followUp1SentAt: { not: null },
        followUp2SentAt: null,
      }),
      limit,
      extra,
      [{ nextFollowUpAt: "asc" }],
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        handoffRequired: true,
      }),
      limit,
      extra,
    ),
  ]);

  return {
    prepareFirstMessage,
    sendPreparedMessage,
    firstFollowUpDue,
    secondFollowUpDue,
    needHumanReply,
  };
}
