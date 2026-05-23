import type { Prisma, PrismaClient } from "@prisma/client";
import {
  getMalaysiaTodayIsoDate,
  MYT_TIMEZONE,
  mytCalendarDayUtcRange,
} from "./formatMalaysiaTime";
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

/** CSV export: `YYYY-MM-DD HH:mm:ss MYT` (empty when null). */
function formatCsvDateTimeMYT(value: Date | null | undefined): string {
  if (!value) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MYT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(value);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}:${pick("second")} MYT`;
}

/** Excel text formula so leading zeros are preserved: ="601113273706" */
function excelTextCell(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return escapeCsvCell(trimmed);

  return escapeCsvCell(`="${digits}"`);
}

function resolveWhatsAppForExport(row: {
  whatsappPhone: string | null;
  phone: string | null;
  internationalPhone: string | null;
}): string {
  const raw = row.whatsappPhone ?? row.phone ?? row.internationalPhone ?? "";
  return excelTextCell(raw);
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
        formatCsvDateTimeMYT(row.trialRequestedAt),
        formatCsvDateTimeMYT(row.adApprovedAt),
        row.businessName,
        row.contactPerson ?? "",
        resolveWhatsAppForExport(row),
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
        .map((c, i) => (i === 4 ? c : escapeCsvCell(String(c))))
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
