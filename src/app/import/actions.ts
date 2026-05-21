"use server";

import { Prisma } from "@prisma/client";
import {
  ImportLeadsError,
  importLeadsFromExcelBuffer,
} from "../../importLeadsFromExcel";
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

/** Avoid echoing connection strings if a driver ever puts them in `message`. */
function redactConnectionHints(text: string): string {
  return text.replace(/postgres(ql)?:\/\/[^\s'"<>]+/gi, "[redacted]");
}

function logConfirmImportFailure(error: unknown): void {
  const name =
    error instanceof Error ? error.name : typeof error === "object" && error !== null
      ? "NonErrorThrown"
      : typeof error;
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (() => {
            try {
              return JSON.stringify(error);
            } catch {
              return String(error);
            }
          })();
  const message = redactConnectionHints(rawMessage);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(
      "[confirmImportExcelFileAction]",
      JSON.stringify({
        action: "confirmImportExcelFileAction",
        errorName: name,
        errorMessage: message,
        prismaCode: error.code,
        prismaMeta: error.meta ?? null,
      }),
    );
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error(
      "[confirmImportExcelFileAction]",
      JSON.stringify({
        action: "confirmImportExcelFileAction",
        errorName: name,
        errorMessage: message,
        prismaCode: error.errorCode,
      }),
    );
    return;
  }

  console.error(
    "[confirmImportExcelFileAction]",
    JSON.stringify({
      action: "confirmImportExcelFileAction",
      errorName: name,
      errorMessage: message,
    }),
  );
}

function userSafeImportError(error: unknown): string {
  if (error instanceof ImportLeadsError) {
    return `Import failed: ${redactConnectionHints(error.message)}`;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : "a unique field";
      return `Import failed: duplicate value for ${target}.`;
    }
    if (error.code === "P2003") {
      return "Import failed: a related campaign or import batch could not be linked.";
    }
    if (error.code === "P2028") {
      return "Import failed: database transaction timed out. Please try again; the importer now allows a longer import window.";
    }
    return `Import failed: database error ${error.code}.`;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Import failed: database connection could not be initialized.";
  }

  if (error instanceof Error && error.message.trim()) {
    return `Import failed: ${redactConnectionHints(error.message)}`;
  }

  return "Import failed. Check the file and try again.";
}

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
    logConfirmImportFailure(e);
    return {
      ok: false,
      error: userSafeImportError(e),
    };
  }
}
