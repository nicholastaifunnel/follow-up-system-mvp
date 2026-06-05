import * as XLSX from "xlsx";
import * as path from "node:path";

/** Expected Excel headers (exact names). Category maps to googleCategory only — not assignedIndustry. */
export const EXPECTED_HEADERS = [
  "Business Name",
  "Category",
  "Area",
  "Address",
  "Phone",
  "International Phone",
  "Website",
  "Has Website",
  "Social Platform",
  "Social Link",
  "Google Rating",
  "Review Count",
  "Google Maps Link",
  "Place ID",
  "Source Keyword",
  "Website Quality Notes",
  "Suitable Lead",
  "Lead Status",
  "Priority",
  "Manual Notes",
  "Contacted",
  "Response",
  "Follow Up Date",
  "New / Existing Lead",
  "Created At",
] as const;

export type ExpectedHeader = (typeof EXPECTED_HEADERS)[number];

export type ParsedLeadRow = {
  businessName: string;
  googleCategory: string;
  area: string;
  address: string;
  phone: string;
  internationalPhone: string;
  whatsappPhone: string;
  website: string;
  hasWebsiteRaw: string;
  socialPlatform: string;
  socialLink: string;
  googleRating: string;
  reviewCount: string;
  googleMapsLink: string;
  placeId: string;
  sourceKeyword: string;
  websiteQualityNotes: string;
  suitableLead: string;
  leadStatus: string;
  priority: string;
  manualNotes: string;
  contacted: string;
  response: string;
  followUpDate: string;
  newOrExistingLead: string;
  createdAt: string;
  /** Derived — not from Excel as industry. */
  suggestedIndustry: string;
  leadLevel: string;
  outreachReadiness: string;
};

export type PreviewSummary = {
  totalRows: number;
  rowsWithPhone: number;
  rowsWithoutPhone: number;
  rowsWithWebsite: number;
  rowsWithSocialLink: number;
  rowsWithPlaceId: number;
  highPriorityCount: number;
  suitableLeadCount: number;
};

export type IndustryBucket =
  | "采耳 / 头疗"
  | "Beauty Salon"
  | "Spa / Massage"
  | "Nail Salon"
  | "Other";

export type CampaignPreviewInfo = {
  sourceKeyword: string;
  area: string;
  suggestedCampaignName: string;
};

export type PreviewResult = {
  filePath: string;
  sheetName: string;
  campaign: CampaignPreviewInfo;
  summary: PreviewSummary;
  industryCounts: Record<IndustryBucket, number>;
  leadLevelCounts: Record<string, number>;
  outreachReadinessCounts: Record<string, number>;
  previewRows: ParsedLeadRow[];
};

/** One data row: parsed fields + original row JSON for DB `rawRowJson` (not for console). */
export type ExcelImportRow = {
  parsed: ParsedLeadRow;
  rawRowJson: string;
};

export type ExcelImportParseResult = {
  filePath: string;
  sheetName: string;
  campaign: CampaignPreviewInfo;
  rows: ExcelImportRow[];
};

export class ExcelPreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelPreviewError";
  }
}

function normalizeHeader(cell: unknown): string {
  if (cell === undefined || cell === null) return "";
  return String(cell).trim();
}

function buildHeaderIndex(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, i) => {
    const key = normalizeHeader(cell);
    if (key) map.set(key.toLowerCase(), i);
  });
  return map;
}

function getCell(
  row: unknown[],
  headerIndex: Map<string, number>,
  header: ExpectedHeader,
): string {
  const idx = headerIndex.get(header.toLowerCase());
  if (idx === undefined) return "";
  const v = row[idx];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/** First non-empty cell among alternate header names (Lead Cleaner aliases). */
function getCellByNames(
  row: unknown[],
  headerIndex: Map<string, number>,
  names: string[],
): string {
  for (const name of names) {
    const idx = headerIndex.get(name.toLowerCase());
    if (idx === undefined) continue;
    const v = row[idx];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function truthyHasWebsite(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return s === "yes" || s === "y" || s === "true" || s === "1";
}

export function hasNonEmptyPhone(phone: string, internationalPhone: string): boolean {
  return Boolean(phone.trim() || internationalPhone.trim());
}

export function hasWebsite(website: string, hasWebsiteRaw: string): boolean {
  return Boolean(website.trim()) || truthyHasWebsite(hasWebsiteRaw);
}

/** Priority: source keyword → business name → google category (Excel Category only). */
export function detectSuggestedIndustry(input: {
  sourceKeyword: string;
  businessName: string;
  googleCategory: string;
}): IndustryBucket {
  const sk = input.sourceKeyword;
  if (sk.includes("采耳")) return "采耳 / 头疗";

  const bn = input.businessName;
  const bnLower = bn.toLowerCase();
  if (
    bn.includes("采耳") ||
    bn.includes("头疗") ||
    bnLower.includes("earpro") ||
    /\bear\b/i.test(bn)
  ) {
    return "采耳 / 头疗";
  }

  const raw = input.googleCategory.trim().toLowerCase();
  const cat = raw.replace(/\s+/g, "_");
  if (cat === "spa") return "Spa / Massage";
  if (cat === "nail_salon" || cat === "nailsalon" || raw === "nail salon")
    return "Nail Salon";
  if (
    cat === "beauty_salon" ||
    cat === "beautysalon" ||
    raw === "beauty salon"
  ) {
    return "Beauty Salon";
  }

  return "Other";
}

export function detectLeadLevel(input: {
  website: string;
  hasWebsiteRaw: string;
  reviewCount: string;
}): string {
  const websiteOk = hasWebsite(input.website, input.hasWebsiteRaw);
  if (!websiteOk) return "No Website";

  const n = parseInt(input.reviewCount.replace(/,/g, ""), 10);
  const reviews = Number.isFinite(n) ? n : 0;
  if (reviews < 30) return "Low Review";

  if (Boolean(input.website.trim())) return "Has Website";

  return "General";
}

export function detectOutreachReadiness(input: {
  phone: string;
  internationalPhone: string;
  website: string;
  hasWebsiteRaw: string;
  socialLink: string;
}): string {
  if (hasNonEmptyPhone(input.phone, input.internationalPhone)) return "Ready";

  const web = hasWebsite(input.website, input.hasWebsiteRaw);
  const social = Boolean(input.socialLink.trim());
  if (!hasNonEmptyPhone(input.phone, input.internationalPhone) && (web || social)) {
    return "Need Check";
  }

  if (!web && !social) return "Low Quality";

  return "Need Check";
}

function modeNonEmpty(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) {
    const t = v.trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best = "";
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

function suggestedCampaignName(
  keyword: string,
  area: string,
  filePath: string,
): string {
  const base = path.basename(filePath, path.extname(filePath));
  const kw = keyword.trim();
  const ar = area.trim();
  if (kw && ar) {
    const lowerKw = kw.toLowerCase();
    const lowerAr = ar.toLowerCase();
    if (lowerKw.endsWith(lowerAr) || lowerKw.includes(lowerAr + " ")) {
      return kw;
    }
    return `${kw} – ${ar}`;
  }
  if (kw) return kw;
  if (ar) return `Leads – ${ar}`;
  return `Import – ${base}`;
}

function isHighPriority(raw: string): boolean {
  return raw.trim().toLowerCase() === "high";
}

function isSuitableLead(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return s === "yes" || s === "y" || s === "true" || s === "1";
}

function buildRawRowJson(headerRow: unknown[], row: unknown[]): string {
  const obj: Record<string, string> = {};
  headerRow.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (!key) return;
    const val = row[i];
    obj[key] = val === undefined || val === null ? "" : String(val);
  });
  return JSON.stringify(obj);
}

function parseRow(
  row: unknown[],
  headerIndex: Map<string, number>,
): ParsedLeadRow {
  const businessName = getCell(row, headerIndex, "Business Name");
  const googleCategory = getCell(row, headerIndex, "Category");
  const area = getCell(row, headerIndex, "Area");
  const address = getCell(row, headerIndex, "Address");
  const phone = getCell(row, headerIndex, "Phone");
  const internationalPhone = getCell(row, headerIndex, "International Phone");
  const whatsappPhone = getCellByNames(row, headerIndex, ["WhatsApp Phone"]);
  const website = getCell(row, headerIndex, "Website");
  const hasWebsiteRaw = getCell(row, headerIndex, "Has Website");
  const socialPlatform = getCell(row, headerIndex, "Social Platform");
  const socialLink = getCell(row, headerIndex, "Social Link");
  const googleRating =
    getCell(row, headerIndex, "Google Rating") ||
    getCellByNames(row, headerIndex, ["Rating"]);
  const reviewCount = getCell(row, headerIndex, "Review Count");
  const googleMapsLink = getCell(row, headerIndex, "Google Maps Link");
  const placeId = getCell(row, headerIndex, "Place ID");
  const sourceKeyword = getCell(row, headerIndex, "Source Keyword");
  const websiteQualityNotes = getCell(row, headerIndex, "Website Quality Notes");
  const suitableLead = getCell(row, headerIndex, "Suitable Lead");
  const leadStatus = getCell(row, headerIndex, "Lead Status");
  const priority = getCell(row, headerIndex, "Priority");
  const manualNotes =
    getCell(row, headerIndex, "Manual Notes") ||
    getCellByNames(row, headerIndex, ["Notes"]);
  const contacted = getCell(row, headerIndex, "Contacted");
  const response = getCell(row, headerIndex, "Response");
  const followUpDate = getCell(row, headerIndex, "Follow Up Date");
  const newOrExistingLead = getCell(row, headerIndex, "New / Existing Lead");
  const createdAt = getCell(row, headerIndex, "Created At");

  const suggestedIndustry = detectSuggestedIndustry({
    sourceKeyword,
    businessName,
    googleCategory,
  });
  const leadLevel = detectLeadLevel({ website, hasWebsiteRaw, reviewCount });
  const outreachReadiness = detectOutreachReadiness({
    phone,
    internationalPhone,
    website,
    hasWebsiteRaw,
    socialLink,
  });

  return {
    businessName,
    googleCategory,
    area,
    address,
    phone,
    internationalPhone,
    whatsappPhone,
    website,
    hasWebsiteRaw,
    socialPlatform,
    socialLink,
    googleRating,
    reviewCount,
    googleMapsLink,
    placeId,
    sourceKeyword,
    websiteQualityNotes,
    suitableLead,
    leadStatus,
    priority,
    manualNotes,
    contacted,
    response,
    followUpDate,
    newOrExistingLead,
    createdAt,
    suggestedIndustry,
    leadLevel,
    outreachReadiness,
  };
}

function ensureXlsxPath(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".xlsx") {
    throw new ExcelPreviewError(
      `Invalid file type: expected .xlsx, got "${ext || "(no extension)"}".`,
    );
  }
}

function ensureXlsxFileName(fileName: string): void {
  ensureXlsxPath(path.join("upload", path.basename(fileName)));
}

function aggregatePreviewStats(
  parsed: ParsedLeadRow[],
  filePath: string,
): {
  campaign: CampaignPreviewInfo;
  summary: PreviewSummary;
  industryCounts: Record<IndustryBucket, number>;
  leadLevelCounts: Record<string, number>;
  outreachReadinessCounts: Record<string, number>;
} {
  const sourceKeywords = parsed.map((p) => p.sourceKeyword);
  const areas = parsed.map((p) => p.area);
  const campaign: CampaignPreviewInfo = {
    sourceKeyword: modeNonEmpty(sourceKeywords),
    area: modeNonEmpty(areas),
    suggestedCampaignName: suggestedCampaignName(
      modeNonEmpty(sourceKeywords),
      modeNonEmpty(areas),
      filePath,
    ),
  };

  let rowsWithPhone = 0;
  let rowsWithWebsite = 0;
  let rowsWithSocialLink = 0;
  let rowsWithPlaceId = 0;
  let highPriorityCount = 0;
  let suitableLeadCount = 0;

  const industryCounts: Record<IndustryBucket, number> = {
    "采耳 / 头疗": 0,
    "Beauty Salon": 0,
    "Spa / Massage": 0,
    "Nail Salon": 0,
    Other: 0,
  };

  const leadLevelCounts: Record<string, number> = {};
  const outreachCounts: Record<string, number> = {};

  for (const p of parsed) {
    if (hasNonEmptyPhone(p.phone, p.internationalPhone)) rowsWithPhone += 1;
    if (hasWebsite(p.website, p.hasWebsiteRaw)) rowsWithWebsite += 1;
    if (p.socialLink.trim()) rowsWithSocialLink += 1;
    if (p.placeId.trim()) rowsWithPlaceId += 1;
    if (isHighPriority(p.priority)) highPriorityCount += 1;
    if (isSuitableLead(p.suitableLead)) suitableLeadCount += 1;

    const ind = p.suggestedIndustry as IndustryBucket;
    if (ind in industryCounts) industryCounts[ind] += 1;
    else industryCounts.Other += 1;

    leadLevelCounts[p.leadLevel] = (leadLevelCounts[p.leadLevel] ?? 0) + 1;
    outreachCounts[p.outreachReadiness] =
      (outreachCounts[p.outreachReadiness] ?? 0) + 1;
  }

  const totalRows = parsed.length;
  const summary: PreviewSummary = {
    totalRows,
    rowsWithPhone,
    rowsWithoutPhone: totalRows - rowsWithPhone,
    rowsWithWebsite,
    rowsWithSocialLink,
    rowsWithPlaceId,
    highPriorityCount,
    suitableLeadCount,
  };

  return {
    campaign,
    summary,
    industryCounts,
    leadLevelCounts,
    outreachReadinessCounts: outreachCounts,
  };
}

/**
 * Shared sheet/header/row parsing after a workbook has been loaded (file or buffer).
 * `filePathLabel` is used for campaign naming and `ExcelImportParseResult.filePath`
 * (basename is used where a filename is needed).
 */
export function parseExcelWorkbookForImport(
  workbook: XLSX.WorkBook,
  filePathLabel: string,
): ExcelImportParseResult {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ExcelPreviewError("File has no worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new ExcelPreviewError("First worksheet is missing or unreadable.");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (!rows.length) {
    throw new ExcelPreviewError("File is empty (no rows).");
  }

  const headerRow = rows[0] ?? [];
  const headerIndex = buildHeaderIndex(headerRow);
  if (!headerIndex.has("business name")) {
    throw new ExcelPreviewError(
      'Missing required column: "Business Name" (header row must include this exact name).',
    );
  }

  const dataRows = rows.slice(1).filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""));
  if (!dataRows.length) {
    throw new ExcelPreviewError("No data rows found (only headers or blank rows).");
  }

  const rowObjs: ExcelImportRow[] = dataRows.map((r) => {
    const arr = Array.isArray(r) ? r : [];
    return {
      parsed: parseRow(arr, headerIndex),
      rawRowJson: buildRawRowJson(headerRow, arr),
    };
  });

  const parsed = rowObjs.map((x) => x.parsed);
  const { campaign } = aggregatePreviewStats(parsed, filePathLabel);

  return {
    filePath: filePathLabel,
    sheetName,
    campaign,
    rows: rowObjs,
  };
}

/**
 * Reads first worksheet only. Returns all data rows + `rawRowJson` per row.
 * Does not connect to Prisma or any database.
 */
export function parseExcelForImport(filePath: string): ExcelImportParseResult {
  ensureXlsxPath(filePath);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(filePath, { cellDates: true });
  } catch (e: unknown) {
    if (process.env.NODE_ENV === "development") {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[excelImportPreview] XLSX.readFile failed:", msg);
    }
    throw new ExcelPreviewError("Could not read file as Excel workbook.");
  }

  return parseExcelWorkbookForImport(workbook, filePath);
}

/**
 * Same rules as {@link parseExcelForImport}, but reads from an in-memory buffer (for web uploads).
 */
export function parseExcelBufferForImport(
  buffer: Buffer,
  originalFileName: string,
): ExcelImportParseResult {
  ensureXlsxFileName(originalFileName);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (e: unknown) {
    if (process.env.NODE_ENV === "development") {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[excelImportPreview] XLSX.read(buffer) failed:", msg);
    }
    throw new ExcelPreviewError("Could not read file as Excel workbook.");
  }

  const label = path.basename(originalFileName);
  return parseExcelWorkbookForImport(workbook, label);
}

function buildPreviewResultFromParse(
  parse: ExcelImportParseResult,
): PreviewResult {
  const { filePath: fp, sheetName, campaign, rows } = parse;
  const parsed = rows.map((r) => r.parsed);
  const {
    summary,
    industryCounts,
    leadLevelCounts,
    outreachReadinessCounts,
  } = aggregatePreviewStats(parsed, fp);

  return {
    filePath: fp,
    sheetName,
    campaign,
    summary,
    industryCounts,
    leadLevelCounts,
    outreachReadinessCounts,
    previewRows: parsed.slice(0, 20),
  };
}

/**
 * Reads first worksheet only. Does not connect to Prisma or any database.
 */
export function previewExcelImport(filePath: string): PreviewResult {
  return buildPreviewResultFromParse(parseExcelForImport(filePath));
}

/** Same output as {@link previewExcelImport}, for in-memory uploads (no temp file). */
export function previewExcelImportFromBuffer(
  buffer: Buffer,
  originalFileName: string,
): PreviewResult {
  return buildPreviewResultFromParse(
    parseExcelBufferForImport(buffer, originalFileName),
  );
}
