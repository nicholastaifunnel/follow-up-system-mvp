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
