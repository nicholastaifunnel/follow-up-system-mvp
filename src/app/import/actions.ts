"use server";

import { importLeadsFromExcelBuffer } from "../../importLeadsFromExcel";
import { prisma } from "../../lib/prisma";
import {
  ExcelPreviewError,
  previewExcelImportFromBuffer,
  type CampaignPreviewInfo,
  type IndustryBucket,
  type ParsedLeadRow,
  type PreviewSummary,
} from "../../excelImportPreview";

export type PreviewExcelSuccessData = {
  sheetName: string;
  campaign: CampaignPreviewInfo;
  summary: PreviewSummary & { rowsWithoutWebsite: number };
  industryCounts: Record<IndustryBucket, number>;
  leadLevelCounts: Record<string, number>;
  outreachReadinessCounts: Record<string, number>;
  previewRows: ParsedLeadRow[];
};

export type PreviewExcelFileActionResult =
  | { ok: true; data: PreviewExcelSuccessData }
  | { ok: false; error: string };

function isXlsxFilename(name: string): boolean {
  return name.toLowerCase().endsWith(".xlsx");
}

type XlsxFileValidation =
  | { ok: true; file: File }
  | { ok: false; error: string };

function validateXlsxFileEntry(
  entry: FormDataEntryValue | null,
): XlsxFileValidation {
  if (entry === null || entry === undefined) {
    return { ok: false, error: "Please choose an Excel file (.xlsx)." };
  }

  if (typeof entry === "string") {
    return { ok: false, error: "Please choose an Excel file (.xlsx)." };
  }

  const file = entry as File;

  if (!isXlsxFilename(file.name)) {
    return {
      ok: false,
      error: 'Invalid file type: only ".xlsx" files are supported.',
    };
  }

  if (file.size === 0) {
    return { ok: false, error: "The selected file is empty." };
  }

  return { ok: true, file };
}

export type ConfirmImportExcelSuccessData = {
  campaignName: string;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  duplicateCount: number;
  skippedCount: number;
  missingPhoneCount: number;
  missingWebsiteCount: number;
};

export type ConfirmImportExcelFileActionResult =
  | { ok: true; data: ConfirmImportExcelSuccessData }
  | { ok: false; error: string };

export async function previewExcelFileAction(
  formData: FormData,
): Promise<PreviewExcelFileActionResult> {
  const validated = validateXlsxFileEntry(formData.get("file"));
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const { file } = validated;

  try {
    const buf = Buffer.from(await file.arrayBuffer());

    const result = previewExcelImportFromBuffer(buf, file.name);

    const rowsWithoutWebsite =
      result.summary.totalRows - result.summary.rowsWithWebsite;

    return {
      ok: true,
      data: {
        sheetName: result.sheetName,
        campaign: result.campaign,
        summary: {
          ...result.summary,
          rowsWithoutWebsite,
        },
        industryCounts: result.industryCounts,
        leadLevelCounts: result.leadLevelCounts,
        outreachReadinessCounts: result.outreachReadinessCounts,
        previewRows: result.previewRows,
      },
    };
  } catch (e) {
    if (e instanceof ExcelPreviewError) {
      return { ok: false, error: e.message };
    }
    return {
      ok: false,
      error: "Could not preview this file. Check the file and try again.",
    };
  }
}

export async function confirmImportExcelFileAction(
  formData: FormData,
): Promise<ConfirmImportExcelFileActionResult> {
  const validated = validateXlsxFileEntry(formData.get("file"));
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const { file } = validated;

  try {
    const buf = Buffer.from(await file.arrayBuffer());

    const r = await importLeadsFromExcelBuffer(prisma, buf, file.name);

    return {
      ok: true,
      data: {
        campaignName: r.campaignName,
        totalRows: r.totalRows,
        insertedCount: r.insertedCount,
        updatedCount: r.updatedCount,
        duplicateCount: r.duplicateCount,
        skippedCount: r.skippedCount,
        missingPhoneCount: r.missingPhoneCount,
        missingWebsiteCount: r.missingWebsiteCount,
      },
    };
  } catch (e) {
    if (e instanceof ExcelPreviewError) {
      return { ok: false, error: e.message };
    }
    return {
      ok: false,
      error:
        "Import failed. Check the file and try again. If the problem continues, verify your database connection.",
    };
  }
}
