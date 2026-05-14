import * as path from "node:path";
import type { Lead, Prisma, PrismaClient } from "@prisma/client";
import {
  type CampaignPreviewInfo,
  type ExcelImportRow,
  type ExcelImportParseResult,
  type ParsedLeadRow,
  hasNonEmptyPhone,
  hasWebsite,
  parseExcelBufferForImport,
  parseExcelForImport,
} from "./excelImportPreview";

export type ImportLeadsResult = {
  campaignId: string;
  campaignName: string;
  importBatchId: string;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  duplicateCount: number;
  skippedCount: number;
  missingPhoneCount: number;
  missingWebsiteCount: number;
  missingSocialCount: number;
  industryCounts: Record<string, number>;
  leadLevelCounts: Record<string, number>;
  outreachReadinessCounts: Record<string, number>;
};

function coercePlaceId(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

function parseFollowUpDate(raw: string): Date | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseGoogleRating(raw: string): number | undefined {
  const n = parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseReviewCount(raw: string): number | undefined {
  const n = parseInt(String(raw).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function dominantSuggestedIndustry(rows: ParsedLeadRow[]): string | null {
  const counts = new Map<string, number>();
  for (const p of rows) {
    if (!p.businessName.trim()) continue;
    counts.set(p.suggestedIndustry, (counts.get(p.suggestedIndustry) ?? 0) + 1);
  }
  if (!counts.size) return null;
  let bestN = 0;
  for (const n of counts.values()) {
    if (n > bestN) bestN = n;
  }
  const tops = [...counts.entries()].filter(([, n]) => n === bestN);
  if (tops.length !== 1) return null;
  return tops[0][0];
}

/** Empty string → null for nullable Campaign dimensions (match + create). */
function normalizeCampaignDimension(value: string | null | undefined): string | null {
  const t = (value ?? "").trim();
  return t.length ? t : null;
}

async function findOrCreateCampaign(
  tx: Prisma.TransactionClient,
  preview: CampaignPreviewInfo,
  defaultIndustry: string | null,
) {
  const name = preview.suggestedCampaignName;
  const sourceKeyword = normalizeCampaignDimension(preview.sourceKeyword);
  const area = normalizeCampaignDimension(preview.area);

  const existing = await tx.campaign.findFirst({
    where: {
      name,
      sourceKeyword,
      area,
    },
  });

  if (existing) return existing;

  return tx.campaign.create({
    data: {
      name,
      sourceKeyword,
      area,
      defaultIndustry,
      defaultFollowUpDays: 3,
      defaultReplyCheckHours: 24,
    },
  });
}

/**
 * Dedupe order: placeId → phone+businessName → businessName+area (area required).
 * No businessName-only merge.
 */
async function findExistingLead(
  tx: Prisma.TransactionClient,
  p: ParsedLeadRow,
): Promise<Lead | null> {
  const bn = p.businessName.trim();
  if (!bn) return null;

  const pid = coercePlaceId(p.placeId);
  if (pid) {
    const byPlace = await tx.lead.findUnique({ where: { placeId: pid } });
    if (byPlace) return byPlace;
  }

  const excelPhones = [p.phone, p.internationalPhone].map((x) => x.trim()).filter(Boolean);
  if (excelPhones.length) {
    const byPhone = await tx.lead.findFirst({
      where: {
        businessName: bn,
        OR: excelPhones.flatMap((ph) => [
          { phone: ph },
          { internationalPhone: ph },
        ]),
      },
    });
    if (byPhone) return byPhone;
  }

  const areaNorm = normalizeCampaignDimension(p.area);
  if (areaNorm) {
    const byNameArea = await tx.lead.findFirst({
      where: {
        businessName: bn,
        area: areaNorm,
      },
    });
    if (byNameArea) return byNameArea;
  }

  return null;
}

function pickPriority(p: ParsedLeadRow): string {
  const t = p.priority.trim();
  return t || "Normal";
}

function mergeOptional(
  current: string | null | undefined,
  incoming: string,
): string | undefined {
  const inc = incoming.trim();
  if (!inc) return undefined;
  const cur = (current ?? "").trim();
  if (!cur) return inc;
  return undefined;
}

function buildInsertData(
  campaignId: string,
  importBatchId: string,
  row: ExcelImportRow,
  now: Date,
): Prisma.LeadCreateInput {
  const p = row.parsed;
  const nextFollowUpAt = parseFollowUpDate(p.followUpDate);
  const googleRating = parseGoogleRating(p.googleRating);
  const reviewCount = parseReviewCount(p.reviewCount);

  return {
    campaign: { connect: { id: campaignId } },
    importBatch: { connect: { id: importBatchId } },
    businessName: p.businessName.trim(),
    googleCategory: p.googleCategory.trim() || undefined,
    area: p.area.trim() || undefined,
    address: p.address.trim() || undefined,
    phone: p.phone.trim() || undefined,
    internationalPhone: p.internationalPhone.trim() || undefined,
    website: p.website.trim() || undefined,
    socialPlatform: p.socialPlatform.trim() || undefined,
    socialLink: p.socialLink.trim() || undefined,
    googleRating,
    reviewCount,
    googleMapsLink: p.googleMapsLink.trim() || undefined,
    placeId: coercePlaceId(p.placeId) ?? undefined,
    sourceKeyword: p.sourceKeyword.trim() || undefined,
    sourceLeadStatus: p.leadStatus.trim() || undefined,
    rawRowJson: row.rawRowJson,
    suggestedIndustry: p.suggestedIndustry,
    assignedIndustry: p.suggestedIndustry,
    leadLevel: p.leadLevel,
    outreachReadiness: p.outreachReadiness,
    priority: pickPriority(p),
    messageStatus: "Not Prepared",
    replyStatus: null,
    contactStatus: "Not Contacted",
    leadTemperature: "Cold",
    manualNotes: p.manualNotes.trim() || undefined,
    isArchived: false,
    botStatus: "Not Connected",
    firstImportedAt: now,
    lastImportedAt: now,
    nextFollowUpAt,
  };
}

function buildUpdateData(
  existing: Lead,
  campaignId: string,
  importBatchId: string,
  row: ExcelImportRow,
  now: Date,
): Prisma.LeadUpdateInput {
  const p = row.parsed;
  const nextFollowUp = parseFollowUpDate(p.followUpDate);

  const data: Prisma.LeadUpdateInput = {
    importBatch: { connect: { id: importBatchId } },
    lastImportedAt: now,
    rawRowJson: row.rawRowJson,
    leadLevel: p.leadLevel,
    outreachReadiness: p.outreachReadiness,
    priority: pickPriority(p),
  };

  if (!existing.campaignId) {
    data.campaign = { connect: { id: campaignId } };
  }

  const mPhone = mergeOptional(existing.phone, p.phone);
  if (mPhone !== undefined) data.phone = mPhone;
  const mIntl = mergeOptional(existing.internationalPhone, p.internationalPhone);
  if (mIntl !== undefined) data.internationalPhone = mIntl;
  const mWeb = mergeOptional(existing.website, p.website);
  if (mWeb !== undefined) data.website = mWeb;
  const mSp = mergeOptional(existing.socialPlatform, p.socialPlatform);
  if (mSp !== undefined) data.socialPlatform = mSp;
  const mSl = mergeOptional(existing.socialLink, p.socialLink);
  if (mSl !== undefined) data.socialLink = mSl;
  const mGm = mergeOptional(existing.googleMapsLink, p.googleMapsLink);
  if (mGm !== undefined) data.googleMapsLink = mGm;

  const mCat = mergeOptional(existing.googleCategory, p.googleCategory);
  if (mCat !== undefined) data.googleCategory = mCat;
  const mSk = mergeOptional(existing.sourceKeyword, p.sourceKeyword);
  if (mSk !== undefined) data.sourceKeyword = mSk;
  const mArea = mergeOptional(existing.area, p.area);
  if (mArea !== undefined) data.area = mArea;

  if (!(existing.manualNotes ?? "").trim() && p.manualNotes.trim()) {
    data.manualNotes = p.manualNotes.trim();
  }

  if (!(existing.suggestedIndustry ?? "").trim()) {
    data.suggestedIndustry = p.suggestedIndustry;
  }

  const hasManual = Boolean((existing.manualIndustry ?? "").trim());
  if (!hasManual) {
    if (!(existing.assignedIndustry ?? "").trim()) {
      data.assignedIndustry = p.suggestedIndustry;
    }
  }

  if (nextFollowUp) {
    data.nextFollowUpAt = nextFollowUp;
  }

  const gr = parseGoogleRating(p.googleRating);
  if (gr !== undefined && existing.googleRating == null) data.googleRating = gr;
  const rc = parseReviewCount(p.reviewCount);
  if (rc !== undefined && existing.reviewCount == null) data.reviewCount = rc;

  const pid = coercePlaceId(p.placeId);
  if (pid && !existing.placeId) data.placeId = pid;

  const addr = mergeOptional(existing.address, p.address);
  if (addr !== undefined) data.address = addr;

  return data;
}

function bumpIndustry(
  m: Record<string, number>,
  key: string,
): void {
  m[key] = (m[key] ?? 0) + 1;
}

/**
 * Parses Excel (reuse preview rules), creates Campaign + ImportBatch, upserts Leads with dedupe.
 */
export async function importLeadsFromExcel(
  db: PrismaClient,
  filePath: string,
): Promise<ImportLeadsResult> {
  const parsedWorkbook = parseExcelForImport(filePath);
  return importLeadsFromParsedWorkbook(
    db,
    parsedWorkbook,
    path.basename(filePath),
  );
}

/**
 * Same as {@link importLeadsFromExcel} but reads from a buffer (web upload; avoids temp-file read issues).
 */
export async function importLeadsFromExcelBuffer(
  db: PrismaClient,
  buffer: Buffer,
  originalFileName: string,
): Promise<ImportLeadsResult> {
  const parsedWorkbook = parseExcelBufferForImport(buffer, originalFileName);
  return importLeadsFromParsedWorkbook(
    db,
    parsedWorkbook,
    path.basename(originalFileName),
  );
}

async function importLeadsFromParsedWorkbook(
  db: PrismaClient,
  parsedWorkbook: ExcelImportParseResult,
  filename: string,
): Promise<ImportLeadsResult> {
  const { rows, campaign: previewCampaign } = parsedWorkbook;
  const now = new Date();

  const nonSkippedForDominant = rows
    .map((r) => r.parsed)
    .filter((p) => p.businessName.trim());
  const defaultIndustry = dominantSuggestedIndustry(nonSkippedForDominant);

  let insertedCount = 0;
  let updatedCount = 0;
  let duplicateCount = 0;
  let skippedCount = 0;
  let missingPhoneCount = 0;
  let missingWebsiteCount = 0;
  let missingSocialCount = 0;

  const industryCounts: Record<string, number> = {};
  const leadLevelCounts: Record<string, number> = {};
  const outreachReadinessCounts: Record<string, number> = {};

  const { campaignId, importBatchId, campaignName } = await db.$transaction(
    async (tx) => {
      const campaign = await findOrCreateCampaign(
        tx,
        previewCampaign,
        defaultIndustry,
      );

      const batch = await tx.importBatch.create({
        data: {
          campaignId: campaign.id,
          filename,
          totalRows: rows.length,
        },
      });

      for (const row of rows) {
        const p = row.parsed;
        if (!p.businessName.trim()) {
          skippedCount += 1;
          continue;
        }

        if (!hasNonEmptyPhone(p.phone, p.internationalPhone)) {
          missingPhoneCount += 1;
        }
        if (!hasWebsite(p.website, p.hasWebsiteRaw)) {
          missingWebsiteCount += 1;
        }
        if (!p.socialLink.trim()) {
          missingSocialCount += 1;
        }

        bumpIndustry(industryCounts, p.suggestedIndustry);
        leadLevelCounts[p.leadLevel] = (leadLevelCounts[p.leadLevel] ?? 0) + 1;
        outreachReadinessCounts[p.outreachReadiness] =
          (outreachReadinessCounts[p.outreachReadiness] ?? 0) + 1;

        const existing = await findExistingLead(tx, p);
        if (existing) {
          duplicateCount += 1;
          updatedCount += 1;
          await tx.lead.update({
            where: { id: existing.id },
            data: buildUpdateData(existing, campaign.id, batch.id, row, now),
          });
        } else {
          insertedCount += 1;
          await tx.lead.create({
            data: buildInsertData(campaign.id, batch.id, row, now),
          });
        }
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          totalRows: rows.length,
          insertedCount,
          updatedCount,
          duplicateCount,
          skippedCount,
          missingPhoneCount,
          missingWebsiteCount,
          missingSocialCount,
        },
      });

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        importBatchId: batch.id,
      };
    },
    { maxWait: 10000, timeout: 30000 },
  );

  return {
    campaignId,
    campaignName,
    importBatchId,
    totalRows: rows.length,
    insertedCount,
    updatedCount,
    duplicateCount,
    skippedCount,
    missingPhoneCount,
    missingWebsiteCount,
    missingSocialCount,
    industryCounts,
    leadLevelCounts,
    outreachReadinessCounts,
  };
}