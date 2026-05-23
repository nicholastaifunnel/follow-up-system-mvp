import type { Prisma, PrismaClient } from "@prisma/client";
import { getMalaysiaTodayIsoDate, mytCalendarDayUtcRange } from "./formatMalaysiaTime";
import { AD_LEAD_APPROVED } from "./adLeadStatus";

export type AdLeadsExportFilters = {
  /** YYYY-MM-DD MYT single day */
  date?: string;
  /** YYYY-MM-DD MYT inclusive range */
  dateFrom?: string;
  dateTo?: string;
  approvedOnly?: boolean;
  campaignName?: string;
  applyLinkId?: string;
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function fmtIso(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString();
}

function trialStatusLabel(lead: {
  reviewTrialStatus: string | null;
  adLeadStatus: string | null;
}): string {
  if (lead.adLeadStatus && lead.adLeadStatus !== AD_LEAD_APPROVED) {
    return lead.adLeadStatus;
  }
  if (lead.reviewTrialStatus) return lead.reviewTrialStatus;
  return AD_LEAD_APPROVED;
}

export function buildAdLeadsCsv(rows: Awaited<ReturnType<typeof fetchAdLeadsForExport>>): string {
  const headers = [
    "trialRequestedAt",
    "approvedAt",
    "businessName",
    "contactPerson",
    "whatsappNumber",
    "Google Maps Name / URL",
    "Facebook Page",
    "trialStatus",
    "campaignName",
    "campaignId",
    "adSetName",
    "adName",
    "landingPageVersion",
    "applyLinkName",
    "sourceChannel",
    "leadId",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        fmtIso(row.trialRequestedAt),
        fmtIso(row.adApprovedAt),
        row.businessName,
        row.contactPerson ?? "",
        row.whatsappPhone ?? row.phone ?? row.internationalPhone ?? "",
        row.googleMapName ?? "",
        row.facebookPage ?? "",
        trialStatusLabel(row),
        row.adCampaignName ?? "",
        row.adCampaignId ?? "",
        row.adSetName ?? "",
        row.adName ?? "",
        row.landingPageVersion ?? "",
        row.applyLinkName ?? "",
        row.inboundSourceChannel ?? "",
        row.id,
      ]
        .map((c) => escapeCsvCell(String(c)))
        .join(","),
    );
  }
  return lines.join("\r\n");
}

export async function fetchAdLeadsForExport(
  db: PrismaClient,
  filters: AdLeadsExportFilters,
) {
  const where: Prisma.LeadWhereInput = {
    trialRequestedAt: { not: null },
  };

  if (filters.approvedOnly) {
    where.adLeadStatus = AD_LEAD_APPROVED;
  }

  if (filters.campaignName?.trim()) {
    where.adCampaignName = filters.campaignName.trim();
  }

  if (filters.applyLinkId?.trim()) {
    where.adApplyLinkId = filters.applyLinkId.trim();
  }

  if (filters.date?.trim()) {
    const range = mytCalendarDayUtcRange(filters.date.trim());
    where.trialRequestedAt = { gte: range.start, lt: range.endExclusive };
  } else if (filters.dateFrom?.trim() || filters.dateTo?.trim()) {
    const from = filters.dateFrom?.trim() || getMalaysiaTodayIsoDate();
    const to = filters.dateTo?.trim() || from;
    const startRange = mytCalendarDayUtcRange(from);
    const endRange = mytCalendarDayUtcRange(to);
    where.trialRequestedAt = {
      gte: startRange.start,
      lt: endRange.endExclusive,
    };
  }

  return db.lead.findMany({
    where,
    select: {
      id: true,
      trialRequestedAt: true,
      adApprovedAt: true,
      businessName: true,
      contactPerson: true,
      whatsappPhone: true,
      phone: true,
      internationalPhone: true,
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
      reviewTrialStatus: true,
      reviewTrialStartAt: true,
      reviewTrialEndAt: true,
      reviewPlanType: true,
    },
    orderBy: [{ trialRequestedAt: "asc" }],
  });
}
