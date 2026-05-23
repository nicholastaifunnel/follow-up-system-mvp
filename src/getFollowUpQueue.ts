import type { Prisma, PrismaClient } from "@prisma/client";
import { REPLY_STATUS_WAITING } from "./statusConstants";
import { withActiveOutreachWhere } from "./doNotContact";

const REPLY_STATUS_NO_REPLY_YET = "No Reply Yet";

export type FollowUpQueueLeadRow = {
  id: string;
  businessName: string;
  assignedIndustry: string | null;
  leadLevel: string | null;
  website: string | null;
  reviewCount: number | null;
  googleRating: number | null;
  replyStatus: string | null;
  replyOutcome: string | null;
  contactStatus: string;
  leadTemperature: string;
  messageStatus: string;
  phone: string | null;
  internationalPhone: string | null;
  area: string | null;
  nextCheckAt: Date | null;
  nextFollowUpAt: Date | null;
  nextAction: string | null;
  handoffRequired: boolean;
  handoffReason: string | null;
  campaignName: string | null;
};

export type FollowUpQueueGroup = {
  count: number;
  leads: FollowUpQueueLeadRow[];
};

export type FollowUpQueueResult = {
  dueToday: FollowUpQueueGroup;
  overdue: FollowUpQueueGroup;
  noReplyToCheck: FollowUpQueueGroup;
  needHuman: FollowUpQueueGroup;
  followUpLater: FollowUpQueueGroup;
};

export type GetFollowUpQueueOptions = {
  /** Per-group row cap (default 10, max 500). */
  limit?: number;
};

const leadSelect = {
  id: true,
  businessName: true,
  assignedIndustry: true,
  leadLevel: true,
  website: true,
  reviewCount: true,
  googleRating: true,
  replyStatus: true,
  replyOutcome: true,
  contactStatus: true,
  leadTemperature: true,
  messageStatus: true,
  phone: true,
  internationalPhone: true,
  area: true,
  nextCheckAt: true,
  nextFollowUpAt: true,
  nextAction: true,
  handoffRequired: true,
  handoffReason: true,
  campaign: { select: { name: true } },
} satisfies Prisma.LeadSelect;

type LeadFollowRecord = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function toRow(lead: LeadFollowRecord): FollowUpQueueLeadRow {
  return {
    id: lead.id,
    businessName: lead.businessName,
    assignedIndustry: lead.assignedIndustry,
    leadLevel: lead.leadLevel,
    website: lead.website,
    reviewCount: lead.reviewCount,
    googleRating: lead.googleRating,
    replyStatus: lead.replyStatus,
    replyOutcome: lead.replyOutcome,
    contactStatus: lead.contactStatus,
    leadTemperature: lead.leadTemperature,
    messageStatus: lead.messageStatus,
    phone: lead.phone,
    internationalPhone: lead.internationalPhone,
    area: lead.area,
    nextCheckAt: lead.nextCheckAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    nextAction: lead.nextAction,
    handoffRequired: lead.handoffRequired,
    handoffReason: lead.handoffReason,
    campaignName: lead.campaign?.name ?? null,
  };
}

async function loadGroup(
  db: PrismaClient,
  where: Prisma.LeadWhereInput,
  limit: number,
  orderBy: Prisma.LeadOrderByWithRelationInput[],
): Promise<FollowUpQueueGroup> {
  const [count, rows] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
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

/**
 * Read-only follow-up / SLA style queues using local calendar day boundaries.
 * Does not mutate leads or call any external API.
 */
export async function getFollowUpQueue(
  db: PrismaClient,
  options?: GetFollowUpQueueOptions,
): Promise<FollowUpQueueResult> {
  const raw = options?.limit ?? 10;
  const limit = Number.isFinite(raw)
    ? Math.min(500, Math.max(1, Math.floor(raw)))
    : 10;

  const now = new Date();
  const dayStart = startOfLocalDay(now);
  const dayEnd = endOfLocalDay(now);

  const [
    dueToday,
    overdue,
    noReplyToCheck,
    needHuman,
    followUpLater,
  ] = await Promise.all([
    loadGroup(
      db,
      withActiveOutreachWhere({
        AND: [
          { nextFollowUpAt: { not: null } },
          { nextFollowUpAt: { gte: dayStart, lte: dayEnd } },
        ],
      }),
      limit,
      [{ nextFollowUpAt: "asc" }],
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        AND: [
          { nextFollowUpAt: { not: null } },
          { nextFollowUpAt: { lt: dayStart } },
        ],
      }),
      limit,
      [{ nextFollowUpAt: "asc" }],
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        replyStatus: { in: [REPLY_STATUS_NO_REPLY_YET, REPLY_STATUS_WAITING] },
        AND: [{ nextCheckAt: { not: null } }, { nextCheckAt: { lte: now } }],
      }),
      limit,
      [{ nextCheckAt: "asc" }],
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        handoffRequired: true,
      }),
      limit,
      [{ updatedAt: "desc" }],
    ),
    loadGroup(
      db,
      withActiveOutreachWhere({
        contactStatus: "Follow Up",
      }),
      limit,
      [{ updatedAt: "desc" }],
    ),
  ]);

  return {
    dueToday,
    overdue,
    noReplyToCheck,
    needHuman,
    followUpLater,
  };
}
