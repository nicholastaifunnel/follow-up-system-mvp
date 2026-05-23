import type { Prisma, PrismaClient } from "@prisma/client";
import {
  AD_LEAD_APPROVED,
  AD_LEAD_NEED_MORE_INFO,
  AD_LEAD_PENDING,
  AD_LEAD_REJECTED,
} from "./adLeadStatus";

export type AdLeadRow = {
  id: string;
  trialRequestedAt: Date | null;
  adApprovedAt: Date | null;
  businessName: string;
  contactPerson: string | null;
  whatsappPhone: string | null;
  googleMapName: string | null;
  facebookPage: string | null;
  adCampaignName: string | null;
  adCampaignId: string | null;
  adSetName: string | null;
  adName: string | null;
  landingPageVersion: string | null;
  applyLinkName: string | null;
  inboundSourceChannel: string | null;
  adLeadStatus: string | null;
  manualNotes: string | null;
};

const select = {
  id: true,
  trialRequestedAt: true,
  adApprovedAt: true,
  businessName: true,
  contactPerson: true,
  whatsappPhone: true,
  googleMapName: true,
  facebookPage: true,
  adCampaignName: true,
  adCampaignId: true,
  adSetName: true,
  adName: true,
  landingPageVersion: true,
  applyLinkName: true,
  inboundSourceChannel: true,
  adLeadStatus: true,
  manualNotes: true,
} satisfies Prisma.LeadSelect;

function baseWhere(): Prisma.LeadWhereInput {
  return { trialRequestedAt: { not: null } };
}

async function loadGroup(
  db: PrismaClient,
  status: string,
  limit: number,
): Promise<{ count: number; leads: AdLeadRow[] }> {
  const where: Prisma.LeadWhereInput = {
    ...baseWhere(),
    adLeadStatus: status,
  };
  const [count, leads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      select,
      orderBy: [{ trialRequestedAt: "desc" }],
      take: limit,
    }),
  ]);
  return { count, leads };
}

export type AdLeadsInboxResult = {
  newTrialRequests: { count: number; leads: AdLeadRow[] };
  needMoreInfo: { count: number; leads: AdLeadRow[] };
  approved: { count: number; leads: AdLeadRow[] };
  rejected: { count: number; leads: AdLeadRow[] };
};

export async function getAdLeadsInbox(
  db: PrismaClient,
  options?: { limit?: number },
): Promise<AdLeadsInboxResult> {
  const raw = options?.limit ?? 50;
  const limit = Math.min(200, Math.max(1, Math.floor(raw)));

  const [newTrialRequests, needMoreInfo, approved, rejected] = await Promise.all([
    loadGroup(db, AD_LEAD_PENDING, limit),
    loadGroup(db, AD_LEAD_NEED_MORE_INFO, limit),
    loadGroup(db, AD_LEAD_APPROVED, limit),
    loadGroup(db, AD_LEAD_REJECTED, limit),
  ]);

  return { newTrialRequests, needMoreInfo, approved, rejected };
}
