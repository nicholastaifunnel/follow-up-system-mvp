import type { Prisma, PrismaClient } from "@prisma/client";
import { mergeQueueListWhere } from "./queueListFilter";
import {
  MESSAGE_STATUS_FIRST_SENT,
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
  REPLY_STATUS_WAITING,
} from "./statusConstants";
import { adTrialColdExclusionWhere } from "./adLeadPhone";
import { LEAD_REVIEW_APPROVED } from "./leadReviewStatus";
import { withActiveOutreachWhere } from "./doNotContact";

export type MessageQueueLeadRow = {
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

export type MessageQueueGroup = {
  count: number;
  leads: MessageQueueLeadRow[];
};

export type MessageQueueResult = {
  notPrepared: MessageQueueGroup;
  preparedNotSent: MessageQueueGroup;
  firstMessageSent: MessageQueueGroup;
  waitingReply: MessageQueueGroup;
  needHuman: MessageQueueGroup;
};

export type GetMessageQueueOptions = {
  /** Per-group row cap (default 10). */
  limit?: number;
  /** Optional AND filter for queue list views (angle / review cap). */
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

type LeadQueueRecord = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

function toRow(lead: LeadQueueRecord): MessageQueueLeadRow {
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
): Promise<MessageQueueGroup> {
  const merged = mergeQueueListWhere(where, listExtraWhere);
  const [count, rows] = await Promise.all([
    db.lead.count({ where: merged }),
    db.lead.findMany({
      where: merged,
      select: leadSelect,
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    }),
  ]);

  return {
    count,
    leads: rows.map(toRow),
  };
}

/**
 * Read-only snapshot of leads grouped by message / reply workflow.
 * Does not mutate leads or send messages.
 */
export async function getMessageQueue(
  db: PrismaClient,
  options?: GetMessageQueueOptions,
): Promise<MessageQueueResult> {
  const raw = options?.limit ?? 10;
  const limit = Number.isFinite(raw)
    ? Math.min(500, Math.max(1, Math.floor(raw)))
    : 10;

  const extra = options?.listExtraWhere;
  const coldEligible = adTrialColdExclusionWhere();

  const [
    notPrepared,
    preparedNotSent,
    firstMessageSent,
    waitingReply,
    needHuman,
  ] = await Promise.all([
    loadGroup(
      db,
      withActiveOutreachWhere({
        AND: [
          coldEligible,
          {
            messageStatus: MESSAGE_STATUS_NOT_PREPARED,
            outreachReadiness: LEAD_REVIEW_APPROVED,
          },
        ],
      }),
      limit,
      extra,
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        AND: [
          coldEligible,
          {
            messageStatus: MESSAGE_STATUS_PREPARED,
            outreachReadiness: LEAD_REVIEW_APPROVED,
          },
        ],
      }),
      limit,
      extra,
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        messageStatus: MESSAGE_STATUS_FIRST_SENT,
      }),
      limit,
      extra,
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        replyStatus: REPLY_STATUS_WAITING,
      }),
      limit,
      extra,
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
    notPrepared,
    preparedNotSent,
    firstMessageSent,
    waitingReply,
    needHuman,
  };
}
