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
  "Notes",
] as const;

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
};

export type ConvertLeadTemplateSummary = {
  totalRows: number;
  convertedRows: number;
  missingBusinessName: number;
  missingPhone: number;
  websiteCount: number;
  socialLinkCount: number;
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
    place_id: cellString(raw.place_id),
    cid: cellString(raw.cid),
    status: cellString(raw.status),
  };
}

export function parseGosomCsvBuffer(buffer: ArrayBuffer): GosomRow[] {
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
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

export function convertGosomRowsToStandardRows(
  gosomRows: GosomRow[],
  options: ConvertLeadTemplateOptions,
): ConvertLeadTemplateResult {
  const area = (options.areaOverride ?? "").trim();
  const rows: StandardLeadTemplateRow[] = [];

  let missingBusinessName = 0;
  let missingPhone = 0;
  let websiteCount = 0;
  let socialLinkCount = 0;
  let mobileWhatsAppCount = 0;
  let landlineOrNotWhatsAppCount = 0;

  for (const g of gosomRows) {
    const phone = g.phone.trim();
    const whatsappPhone = normalizeMalaysiaWhatsAppPhone(phone);
    const { website, socialLink } = splitWebsiteAndSocialLink(g.website);

    if (!g.title.trim()) missingBusinessName += 1;
    if (!phone) missingPhone += 1;
    if (website) websiteCount += 1;
    if (socialLink) socialLinkCount += 1;
    if (whatsappPhone) mobileWhatsAppCount += 1;
    else if (phone) landlineOrNotWhatsAppCount += 1;

    rows.push({
      "Business Name": g.title.trim(),
      Phone: phone,
      "WhatsApp Phone": whatsappPhone,
      Area: area,
      Category: g.category.trim(),
      Address: g.address.trim(),
      Website: website,
      "Social Link": socialLink,
      "Google Maps Link": g.link.trim(),
      "Place ID": g.place_id.trim(),
      CID: g.cid.trim(),
      Rating: g.review_rating ? formatRating(g.review_rating) : "",
      "Review Count": g.review_count ? formatReviewCount(g.review_count) : "",
      Source: options.source.trim() || "gosom_google_maps_scraper",
      "Source Keyword": options.sourceKeyword.trim(),
      "Source File Name": options.sourceFileName.trim(),
      Notes: buildNotes(g.status),
    });
  }

  return {
    rows,
    summary: {
      totalRows: gosomRows.length,
      convertedRows: rows.length,
      missingBusinessName,
      missingPhone,
      websiteCount,
      socialLinkCount,
      mobileWhatsAppCount,
      landlineOrNotWhatsAppCount,
    },
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

export function buildStandardTemplateExcelBuffer(rows: StandardLeadTemplateRow[]): ArrayBuffer {
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [...STANDARD_LEAD_TEMPLATE_COLUMNS],
  });
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
