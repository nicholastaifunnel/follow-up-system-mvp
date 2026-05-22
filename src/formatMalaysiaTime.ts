export const MYT_TIMEZONE = "Asia/Kuala_Lumpur";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function getMalaysiaDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MYT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return { year, month, day };
}

/**
 * Schedule a datetime at a fixed Malaysia local clock time on a calendar day
 * offset from today in MYT. Stored value is an absolute UTC instant.
 */
export function malaysiaScheduledAt(
  daysFromToday: number,
  hour = 10,
  minute = 0,
): Date {
  const anchor = getMalaysiaDateParts(new Date());
  const anchorMidday = new Date(
    `${anchor.year}-${pad2(anchor.month)}-${pad2(anchor.day)}T12:00:00+08:00`,
  );
  const targetDay = new Date(
    anchorMidday.getTime() + daysFromToday * 24 * 60 * 60 * 1000,
  );
  const { year, month, day } = getMalaysiaDateParts(targetDay);

  return new Date(
    `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00+08:00`,
  );
}

/** Datetime fields for UI (e.g. Next Check At). */
export function formatDateTimeMYT(value: Date | null | undefined): string {
  if (!value) return "—";

  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: MYT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: MYT_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);

  return `${datePart}, ${timePart}`;
}

/** Calendar date only in Malaysia time (e.g. 18 May 2026). */
export function formatDateOnlyMYT(value: Date | null | undefined): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MYT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

/** Today’s calendar date in Malaysia (YYYY-MM-DD). */
export function getMalaysiaTodayIsoDate(): string {
  const { year, month, day } = getMalaysiaDateParts(new Date());
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidIsoCalendarDate(iso: string): boolean {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(
    `${year}-${pad2(month)}-${pad2(day)}T12:00:00+08:00`,
  );
  const parts = getMalaysiaDateParts(probe);
  return parts.year === year && parts.month === month && parts.day === day;
}

/** Parse `activityDate=YYYY-MM-DD`; invalid/missing → today MYT. */
export function parseActivityDateParam(
  raw: string | string[] | undefined,
): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === "") return getMalaysiaTodayIsoDate();
  const trimmed = String(v).trim();
  if (!isValidIsoCalendarDate(trimmed)) return getMalaysiaTodayIsoDate();
  return trimmed;
}

/** MYT calendar day as UTC instants: [00:00:00, next day 00:00:00). */
export function mytCalendarDayUtcRange(isoDate: string): {
  start: Date;
  endExclusive: Date;
} {
  const date = isValidIsoCalendarDate(isoDate)
    ? isoDate
    : getMalaysiaTodayIsoDate();
  const m = ISO_DATE_RE.exec(date)!;
  const start = new Date(
    `${m[1]}-${m[2]}-${m[3]}T00:00:00+08:00`,
  );
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, endExclusive };
}
