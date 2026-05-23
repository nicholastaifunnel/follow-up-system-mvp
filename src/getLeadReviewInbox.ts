import type { Prisma, PrismaClient } from "@prisma/client";
import {
  LEAD_REVIEW_NEED_MORE_INFO,
  LEAD_REVIEW_NEEDS_REVIEW,
  LEAD_REVIEW_REJECTED,
} from "./leadReviewStatus";
import { MESSAGE_STATUS_NOT_PREPARED } from "./statusConstants";

export type LeadReviewInboxRow = {
  id: string;
  businessName: string;
  area: string | null;
  sourceKeyword: string | null;
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone: string | null;
  googleRating: number | null;
  reviewCount: number | null;
  outreachReadiness: string | null;
  manualNotes: string | null;
  campaignName: string | null;
};

export type LeadReviewInboxGroup = {
  count: number;
  leads: LeadReviewInboxRow[];
};

export type LeadReviewInboxResult = {
  needsReview: LeadReviewInboxGroup;
  needMoreInfo: LeadReviewInboxGroup;
  rejected: LeadReviewInboxGroup;
};

const leadReviewSelect = {
  id: true,
  businessName: true,
  area: true,
  sourceKeyword: true,
  phone: true,
  internationalPhone: true,
  whatsappPhone: true,
  googleRating: true,
  reviewCount: true,
  outreachReadiness: true,
  manualNotes: true,
  campaign: { select: { name: true } },
} satisfies Prisma.LeadSelect;

type LeadReviewRecord = Prisma.LeadGetPayload<{ select: typeof leadReviewSelect }>;

function toRow(lead: LeadReviewRecord): LeadReviewInboxRow {
  return {
    id: lead.id,
    businessName: lead.businessName,
    area: lead.area,
    sourceKeyword: lead.sourceKeyword,
    phone: lead.phone,
    internationalPhone: lead.internationalPhone,
    whatsappPhone: lead.whatsappPhone,
    googleRating: lead.googleRating,
    reviewCount: lead.reviewCount,
    outreachReadiness: lead.outreachReadiness,
    manualNotes: lead.manualNotes,
    campaignName: lead.campaign?.name ?? null,
  };
}

async function loadReviewGroup(
  db: PrismaClient,
  where: Prisma.LeadWhereInput,
  limit: number,
): Promise<LeadReviewInboxGroup> {
  const [count, rows] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      select: leadReviewSelect,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: limit,
    }),
  ]);

  return { count, leads: rows.map(toRow) };
}

export async function getLeadReviewInbox(
  db: PrismaClient,
  options?: { limit?: number },
): Promise<LeadReviewInboxResult> {
  const raw = options?.limit ?? 10;
  const limit = Number.isFinite(raw)
    ? Math.min(500, Math.max(1, Math.floor(raw)))
    : 10;

  const base: Prisma.LeadWhereInput = {
    isArchived: false,
    skippedAt: null,
    handoffRequired: false,
    messageStatus: MESSAGE_STATUS_NOT_PREPARED,
    trialRequestedAt: null,
  };

  const [needsReview, needMoreInfo, rejected] = await Promise.all([
    loadReviewGroup(
      db,
      {
        ...base,
        OR: [{ outreachReadiness: null }, { outreachReadiness: LEAD_REVIEW_NEEDS_REVIEW }],
      },
      limit,
    ),
    loadReviewGroup(
      db,
      {
        ...base,
        outreachReadiness: LEAD_REVIEW_NEED_MORE_INFO,
      },
      limit,
    ),
    loadReviewGroup(
      db,
      {
        ...base,
        outreachReadiness: LEAD_REVIEW_REJECTED,
      },
      limit,
    ),
  ]);

  return { needsReview, needMoreInfo, rejected };
}
