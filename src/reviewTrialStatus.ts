export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function dateOnlyUtc(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function addUtcDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Days from today (UTC date-only) until end date; negative if past end. */
export function reviewTrialDaysUntilEnd(
  endAt: Date | null,
  today = startOfTodayUtc(),
): number | null {
  if (!endAt) return null;
  const end = dateOnlyUtc(endAt);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}
