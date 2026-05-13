"use server";

import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ExcelPreviewError,
  previewExcelImport,
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

export async function previewExcelFileAction(
  formData: FormData,
): Promise<PreviewExcelFileActionResult> {
  const entry = formData.get("file");

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

  let tmpPath: string | null = null;

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    tmpPath = path.join(
      os.tmpdir(),
      `excel-preview-${Date.now()}-${randomBytes(8).toString("hex")}.xlsx`,
    );
    fs.writeFileSync(tmpPath, buf);

    const result = previewExcelImport(tmpPath);

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
  } finally {
    if (tmpPath) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
  }
}
