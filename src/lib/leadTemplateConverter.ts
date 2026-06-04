import * as XLSX from "xlsx";
import { normalizePhoneDigits } from "@/searchLeadsByPhone";

export const STANDARD_LEAD_TEMPLATE_COLUMNS = [
  "Business Name",
  "Phone",
  "WhatsApp Phone",
  "Area",
  "Category",
  "Address",
  "Website",
  "Social Link",
  "Google Maps Link",
  "Place ID",
  "CID",
  "Rating",
  "Review Count",
  "Source",
  "Source Keyword",
  "Source File Name",
  "Campaign Name",
  "Filter Status",
  "Filter Reason",
  "Notes",
] as const;

export const FILTER_STATUSES = [
  "Keep - Queue Ready",
  "Keep - No Phone but Has Web/Social",
  "Review",
  "Exclude - Irrelevant",
  "Exclude - No Contact Info",
  "Duplicate",
] as const;

export type FilterStatus = (typeof FILTER_STATUSES)[number];

export type StandardLeadTemplateColumn = (typeof STANDARD_LEAD_TEMPLATE_COLUMNS)[number];
export type StandardLeadTemplateRow = Record<StandardLeadTemplateColumn, string>;

export const LEAD_TEMPLATE_SOURCE_OPTIONS = [
  { value: "gosom_google_maps_scraper", label: "gosom_google_maps_scraper" },
  { value: "octoparse", label: "octoparse" },
  { value: "instant_data_scraper", label: "instant_data_scraper" },
  { value: "fiverr", label: "fiverr" },
  { value: "va", label: "va" },
  { value: "directory", label: "directory" },
  { value: "manual", label: "manual" },
  { value: "other", label: "other" },
] as const;

export type GosomRow = {
  title: string;
  link: string;
  category: string;
  address: string;
  website: string;
  phone: string;
  review_count: string;
  review_rating: string;
  place_id: string;
  cid: string;
  status: string;
};

export type ConvertLeadTemplateOptions = {
  source: string;
  sourceKeyword: string;
  sourceFileName: string;
  areaOverride?: string;
  campaignNameOverride?: string;
  keepKeywordsText?: string;
  excludeKeywordsText?: string;
};

export type LeadCleanerFilterSettings = {
  keepKeywords: string[];
  excludeKeywords: string[];
};

export type ConvertLeadTemplateSummary = {
  totalRows: number;
  convertedRows: number;
  missingBusinessName: number;
  missingPhone: number;
  missingWebsite: number;
  missingSocialLink: number;
  keepQueueReady: number;
  keepNoPhoneButHasWebSocial: number;
  review: number;
  excludeIrrelevant: number;
  excludeNoContactInfo: number;
  duplicate: number;
  mobileWhatsAppCount: number;
  landlineOrNotWhatsAppCount: number;
};

export type ConvertLeadTemplateResult = {
  rows: StandardLeadTemplateRow[];
  summary: ConvertLeadTemplateSummary;
};

function cellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

/** Keep long numeric IDs as strings; avoid silent Number precision loss. */
function digitSafeCellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (Number.isInteger(value)) {
      return String(Math.trunc(value));
    }
    return String(value);
  }
  return String(value).trim();
}

/** Detect common UTF-8-as-Latin-1 mojibake fragments. */
const MOJIBAKE_PATTERN = /(?:Â|Ã|â€|æ|è|é|å|ä|ç|¯|ï¿½)/;

function looksLikeMojibake(value: string): boolean {
  return MOJIBAKE_PATTERN.test(value);
}

function textQualityScore(value: string): number {
  let score = 0;
  if (looksLikeMojibake(value)) score -= 10;
  if (/[\u4e00-\u9fff]/.test(value)) score += 5;
  if (/°/.test(value) && !/Â°/.test(value)) score += 1;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) score -= 5;
  return score;
}

function decodeMojibakeBytes(value: string): string | null {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 0xff) return null;
    bytes[i] = code;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
}

function decodeMojibakeLegacyEscape(value: string): string | null {
  try {
    return decodeURIComponent(escape(value)).trim();
  } catch {
    return null;
  }
}

/** Repair UTF-8 text that was mis-decoded as Latin-1 / Windows-1252. */
export function fixMojibake(value: unknown): string {
  let text = cellString(value);
  if (!text) return "";

  if (!looksLikeMojibake(text)) {
    return normalizeDegreeSymbol(text);
  }

  if (/Â°/.test(text)) {
    const quick = text.replace(/Â°/g, "°");
    if (!looksLikeMojibake(quick)) {
      return normalizeDegreeSymbol(quick);
    }
    text = quick;
  }

  const candidates = [text];
  const fromBytes = decodeMojibakeBytes(text);
  if (fromBytes) candidates.push(fromBytes);
  const fromEscape = decodeMojibakeLegacyEscape(text);
  if (fromEscape) candidates.push(fromEscape);

  let best = text;
  let bestScore = textQualityScore(text);
  for (const candidate of candidates) {
    const score = textQualityScore(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return normalizeDegreeSymbol(best);
}

/** e.g. 38°c → 38°C when degree symbol is already correct. */
function normalizeDegreeSymbol(value: string): string {
  return value.replace(/(\d)°c\b/gi, "$1°C");
}

function decodeUtf8CsvBuffer(buffer: ArrayBuffer): string {
  let text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text;
}

function rowToGosomRow(raw: Record<string, unknown>): GosomRow {
  return {
    title: cellString(raw.title),
    link: cellString(raw.link),
    category: cellString(raw.category),
    address: cellString(raw.address),
    website: cellString(raw.website),
    phone: cellString(raw.phone),
    review_count: cellString(raw.review_count),
    review_rating: cellString(raw.review_rating),
    place_id: digitSafeCellString(raw.place_id),
    cid: digitSafeCellString(raw.cid),
    status: cellString(raw.status),
  };
}

export function parseGosomCsvBuffer(buffer: ArrayBuffer): GosomRow[] {
  const csvText = decodeUtf8CsvBuffer(buffer);
  const workbook = XLSX.read(csvText, { type: "string", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return jsonRows.map(rowToGosomRow);
}

const SOCIAL_HOST_PATTERNS = [
  "facebook.com",
  "fb.com",
  "m.facebook.com",
  "instagram.com",
  "tiktok.com",
  "xhslink.com",
  "xiaohongshu.com",
  "linktr.ee",
  "wa.me",
  "api.whatsapp.com",
  "twitter.com",
  "x.com",
  "youtube.com",
];

function isSocialUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    return false;
  }
  if (lower.includes("google.com/maps")) return false;
  return SOCIAL_HOST_PATTERNS.some((host) => lower.includes(host));
}

export function splitWebsiteAndSocialLink(rawWebsite: string): {
  website: string;
  socialLink: string;
} {
  const trimmed = rawWebsite.trim();
  if (!trimmed) return { website: "", socialLink: "" };

  if (isSocialUrl(trimmed)) {
    return { website: "", socialLink: trimmed };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { website: trimmed, socialLink: "" };
  }

  return { website: trimmed, socialLink: "" };
}

/** Malaysia mobile only → digits like 60123456789; landline / invalid → empty. */
export function normalizeMalaysiaWhatsAppPhone(rawPhone: string): string {
  const trimmed = rawPhone.trim();
  if (!trimmed) return "";

  let digits = normalizePhoneDigits(trimmed);
  if (!digits) return "";

  if (digits.startsWith("60")) {
    // already international
  } else if (digits.startsWith("0")) {
    digits = `60${digits.slice(1)}`;
  } else {
    return "";
  }

  // 601x mobile (not 603–609 landline area codes)
  if (!/^601[0-9]\d{7,9}$/.test(digits)) {
    return "";
  }

  return digits;
}

function formatRating(raw: string): string {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw.trim();
  return n.toFixed(1).replace(/\.0$/, "") === String(n) ? String(n) : n.toFixed(1);
}

function formatReviewCount(raw: string): string {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return raw.trim();
  return String(n);
}

function buildNotes(status: string): string {
  const s = status.trim();
  if (!s) return "";
  if (s.length > 120) return s.slice(0, 117) + "...";
  return s;
}

export function parseKeywordLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const keywords: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const kw = line.trim().toLowerCase();
    if (!kw || seen.has(kw)) continue;
    seen.add(kw);
    keywords.push(kw);
  }
  return keywords;
}

function normalizeMatchText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Lowercase; non-alphanumeric (except CJK) → spaces for English token/phrase matching. */
function normalizeTextForKeywordMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u4e00-\u9fff]/g, (ch) => ` ${ch} `)
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** English single-token keyword with word boundaries (ENT ≠ century). */
function matchesEnglishWordKeyword(normalizedText: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw || /\s/.test(kw)) return false;
  const escaped = escapeRegExp(kw);
  const pattern = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "i");
  return pattern.test(` ${normalizedText} `);
}

/** English multi-word phrase with token boundaries between words. */
function matchesEnglishPhraseKeyword(normalizedText: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase().replace(/\s+/g, " ");
  if (!kw || !/\s/.test(kw)) return false;
  const escaped = escapeRegExp(kw).replace(/\s+/g, "\\s+");
  const pattern = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "i");
  return pattern.test(` ${normalizedText} `);
}

/** Match keyword against combined lead text (Chinese includes; English word/phrase boundaries). */
export function matchesLeadKeyword(searchText: string, keyword: string): boolean {
  const kw = keyword.trim();
  if (!kw) return false;

  if (containsChinese(kw)) {
    return searchText.toLowerCase().includes(kw.toLowerCase());
  }

  const normalized = normalizeTextForKeywordMatch(searchText);
  if (/\s/.test(kw)) {
    return matchesEnglishPhraseKeyword(normalized, kw);
  }
  return matchesEnglishWordKeyword(normalized, kw);
}

function findMatchingKeyword(searchText: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    if (matchesLeadKeyword(searchText, kw)) return kw;
  }
  return null;
}

function buildSearchText(row: StandardLeadTemplateRow): string {
  return [
    row["Business Name"],
    row.Category,
    row.Address,
    row.Website,
    row["Social Link"],
    row.Notes,
  ]
    .join(" ")
    .trim();
}

export function resolveCampaignName(
  sourceKeyword: string,
  area: string,
  override?: string,
): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  const kw = sourceKeyword.trim();
  const ar = area.trim();
  if (kw && ar) return `${kw} - ${ar}`;
  return kw || ar;
}

export function classifyLeadRow(
  row: StandardLeadTemplateRow,
  settings: LeadCleanerFilterSettings,
  duplicateReason: string | null,
): { status: FilterStatus; reason: string } {
  if (duplicateReason) {
    return { status: "Duplicate", reason: duplicateReason };
  }

  const phone = row.Phone.trim();
  const whatsapp = row["WhatsApp Phone"].trim();
  const website = row.Website.trim();
  const social = row["Social Link"].trim();
  const hasPhone = Boolean(phone);
  const hasWhatsApp = Boolean(whatsapp);
  const hasWeb = Boolean(website);
  const hasSocial = Boolean(social);
  const searchText = buildSearchText(row);

  const excludeMatch = findMatchingKeyword(searchText, settings.excludeKeywords);
  if (excludeMatch) {
    return {
      status: "Exclude - Irrelevant",
      reason: `Exclude - matched exclude keyword: ${excludeMatch}`,
    };
  }

  if (!hasPhone && !hasWeb && !hasSocial) {
    return {
      status: "Exclude - No Contact Info",
      reason: "Exclude - no phone, no website, no social link",
    };
  }

  if (hasWhatsApp) {
    return {
      status: "Keep - Queue Ready",
      reason: "Keep - has WhatsApp-ready phone and no exclude keyword match",
    };
  }

  if (hasWeb || hasSocial) {
    return {
      status: "Keep - No Phone but Has Web/Social",
      reason: "Keep - has website/social and no exclude keyword match",
    };
  }

  if (hasPhone) {
    return {
      status: "Review",
      reason: "Review - landline only, no WhatsApp-ready mobile",
    };
  }

  return {
    status: "Review",
    reason: "Review - needs manual check",
  };
}

/** Same-upload duplicate detection; first row keeps auto classification. */
export function detectIntraCsvDuplicates(rows: StandardLeadTemplateRow[]): Map<number, string> {
  const duplicateIndices = new Map<number, string>();

  const markByKey = (
    getKey: (row: StandardLeadTemplateRow) => string,
    reason: string,
  ) => {
    const seen = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      if (duplicateIndices.has(i)) continue;
      const key = getKey(rows[i]);
      if (!key) continue;
      const first = seen.get(key);
      if (first === undefined) {
        seen.set(key, i);
      } else {
        duplicateIndices.set(i, reason);
      }
    }
  };

  markByKey((row) => row["Place ID"].trim().toLowerCase(), "Duplicate - same place_id");
  markByKey((row) => row.CID.trim().toLowerCase(), "Duplicate - same cid");
  markByKey((row) => {
    const wa = row["WhatsApp Phone"].trim();
    if (wa) return wa;
    return normalizePhoneDigits(row.Phone);
  }, "Duplicate - same phone");
  markByKey((row) => {
    const name = normalizeMatchText(row["Business Name"]);
    const addr = normalizeMatchText(row.Address);
    if (!name || !addr) return "";
    return `${name}|${addr}`;
  }, "Duplicate - same business name + address");

  return duplicateIndices;
}

export function applyFilterAndDedupe(
  rows: StandardLeadTemplateRow[],
  settings: LeadCleanerFilterSettings,
): void {
  const duplicateMap = detectIntraCsvDuplicates(rows);
  for (let i = 0; i < rows.length; i++) {
    const dupReason = duplicateMap.get(i) ?? null;
    const { status, reason } = classifyLeadRow(rows[i], settings, dupReason);
    rows[i]["Filter Status"] = status;
    rows[i]["Filter Reason"] = reason;
  }
}

export function isKeepFilterStatus(status: string): boolean {
  return status === "Keep - Queue Ready" || status === "Keep - No Phone but Has Web/Social";
}

export function isReviewFilterStatus(status: string): boolean {
  return status === "Review";
}

export function isExcludeOrDuplicateFilterStatus(status: string): boolean {
  return (
    status === "Exclude - Irrelevant" ||
    status === "Exclude - No Contact Info" ||
    status === "Duplicate"
  );
}

export function filterKeepOnlyRows(rows: StandardLeadTemplateRow[]): StandardLeadTemplateRow[] {
  return rows.filter((row) => isKeepFilterStatus(row["Filter Status"]));
}

function buildCleaningSummary(rows: StandardLeadTemplateRow[]): ConvertLeadTemplateSummary {
  let missingBusinessName = 0;
  let missingPhone = 0;
  let missingWebsite = 0;
  let missingSocialLink = 0;
  let keepQueueReady = 0;
  let keepNoPhoneButHasWebSocial = 0;
  let review = 0;
  let excludeIrrelevant = 0;
  let excludeNoContactInfo = 0;
  let duplicate = 0;
  let mobileWhatsAppCount = 0;
  let landlineOrNotWhatsAppCount = 0;

  for (const row of rows) {
    if (!row["Business Name"].trim()) missingBusinessName += 1;
    if (!row.Phone.trim()) missingPhone += 1;
    if (!row.Website.trim()) missingWebsite += 1;
    if (!row["Social Link"].trim()) missingSocialLink += 1;
    if (row["WhatsApp Phone"].trim()) mobileWhatsAppCount += 1;
    else if (row.Phone.trim()) landlineOrNotWhatsAppCount += 1;

    switch (row["Filter Status"]) {
      case "Keep - Queue Ready":
        keepQueueReady += 1;
        break;
      case "Keep - No Phone but Has Web/Social":
        keepNoPhoneButHasWebSocial += 1;
        break;
      case "Review":
        review += 1;
        break;
      case "Exclude - Irrelevant":
        excludeIrrelevant += 1;
        break;
      case "Exclude - No Contact Info":
        excludeNoContactInfo += 1;
        break;
      case "Duplicate":
        duplicate += 1;
        break;
      default:
        break;
    }
  }

  return {
    totalRows: rows.length,
    convertedRows: rows.length,
    missingBusinessName,
    missingPhone,
    missingWebsite,
    missingSocialLink,
    keepQueueReady,
    keepNoPhoneButHasWebSocial,
    review,
    excludeIrrelevant,
    excludeNoContactInfo,
    duplicate,
    mobileWhatsAppCount,
    landlineOrNotWhatsAppCount,
  };
}

export function convertGosomRowsToStandardRows(
  gosomRows: GosomRow[],
  options: ConvertLeadTemplateOptions,
): ConvertLeadTemplateResult {
  const area = (options.areaOverride ?? "").trim();
  const campaignName = resolveCampaignName(
    options.sourceKeyword,
    area,
    options.campaignNameOverride,
  );
  const filterSettings: LeadCleanerFilterSettings = {
    keepKeywords: parseKeywordLines(options.keepKeywordsText ?? ""),
    excludeKeywords: parseKeywordLines(options.excludeKeywordsText ?? ""),
  };
  const rows: StandardLeadTemplateRow[] = [];

  for (const g of gosomRows) {
    const phone = g.phone.trim();
    const whatsappPhone = normalizeMalaysiaWhatsAppPhone(phone);
    const { website, socialLink } = splitWebsiteAndSocialLink(g.website);
    const businessName = fixMojibake(g.title);
    const category = fixMojibake(g.category);
    const address = fixMojibake(g.address);
    const websiteOut = fixMojibake(website);
    const socialLinkOut = fixMojibake(socialLink);
    const googleMapsLink = fixMojibake(g.link);
    const notes = fixMojibake(buildNotes(g.status));

    rows.push({
      "Business Name": businessName,
      Phone: phone,
      "WhatsApp Phone": whatsappPhone,
      Area: area,
      Category: category,
      Address: address,
      Website: websiteOut,
      "Social Link": socialLinkOut,
      "Google Maps Link": googleMapsLink,
      "Place ID": digitSafeCellString(g.place_id),
      CID: digitSafeCellString(g.cid),
      Rating: g.review_rating ? formatRating(g.review_rating) : "",
      "Review Count": g.review_count ? formatReviewCount(g.review_count) : "",
      Source: options.source.trim() || "gosom_google_maps_scraper",
      "Source Keyword": options.sourceKeyword.trim(),
      "Source File Name": options.sourceFileName.trim(),
      "Campaign Name": campaignName,
      "Filter Status": "",
      "Filter Reason": "",
      Notes: notes,
    });
  }

  applyFilterAndDedupe(rows, filterSettings);

  return {
    rows,
    summary: buildCleaningSummary(rows),
  };
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildStandardTemplateCsv(rows: StandardLeadTemplateRow[]): string {
  const lines = [STANDARD_LEAD_TEMPLATE_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      STANDARD_LEAD_TEMPLATE_COLUMNS.map((col) => escapeCsvCell(row[col] ?? "")).join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}`;
}

/** Excel columns forced to Text (@) so long phones / CID are not shown as scientific notation. */
const EXCEL_FORCE_TEXT_COLUMNS = new Set<StandardLeadTemplateColumn>([
  "Business Name",
  "Phone",
  "WhatsApp Phone",
  "Area",
  "Category",
  "Address",
  "Website",
  "Social Link",
  "Google Maps Link",
  "Place ID",
  "CID",
  "Source",
  "Source Keyword",
  "Source File Name",
  "Campaign Name",
  "Filter Status",
  "Filter Reason",
  "Notes",
]);

function setWorksheetCellAsText(sheet: XLSX.WorkSheet, addr: string, value: string): void {
  const text = value ?? "";
  sheet[addr] = { t: "s", v: text, w: text, z: "@" };
}

function forceWorksheetTextCells(sheet: XLSX.WorkSheet): void {
  const ref = sheet["!ref"];
  if (!ref) return;

  const range = XLSX.utils.decode_range(ref);
  const headerRowIndex = range.s.r;
  const columnByIndex = new Map<number, StandardLeadTemplateColumn>();

  for (let col = range.s.c; col <= range.e.c; col++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
    const header = cellString(sheet[addr]?.v);
    if ((STANDARD_LEAD_TEMPLATE_COLUMNS as readonly string[]).includes(header)) {
      columnByIndex.set(col, header as StandardLeadTemplateColumn);
    }
  }

  for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
    for (const [col, field] of columnByIndex) {
      if (!EXCEL_FORCE_TEXT_COLUMNS.has(field)) continue;
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      const existing = sheet[addr];
      const text = cellString(existing?.v ?? existing?.w ?? "");
      setWorksheetCellAsText(sheet, addr, text);
    }
  }
}

export function buildStandardTemplateExcelBuffer(rows: StandardLeadTemplateRow[]): ArrayBuffer {
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [...STANDARD_LEAD_TEMPLATE_COLUMNS],
  });
  forceWorksheetTextCells(sheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export function slugifySourceKeyword(keyword: string): string {
  const slug = keyword
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "leads";
}

export function buildDownloadBaseName(sourceKeyword: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `converted-gosom-${slugifySourceKeyword(sourceKeyword)}-${date}`;
}

export function buildCleanedDownloadBaseName(
  scope: "keep" | "all",
  sourceKeyword: string,
): string {
  const date = new Date().toISOString().slice(0, 10);
  return `cleaned-${scope}-gosom-${slugifySourceKeyword(sourceKeyword)}-${date}`;
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
