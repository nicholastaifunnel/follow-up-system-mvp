import { formatDateOnlyMYT } from "@/formatMalaysiaTime";
import { formatRmFromCents } from "@/money";

export type ReviewPlanUsagePeriod = {
  id: string;
  planType: string;
  startAt: Date;
  endAt: Date | null;
  priceCents: number | null;
  amountCents?: number | null;
  currency: string;
  status: string;
  source: string | null;
  notes?: string | null;
  createdAt: Date;
};

export function resolvePeriodPriceCents(period: {
  priceCents?: number | null;
  amountCents?: number | null;
}): number | null {
  if (period.priceCents !== null && period.priceCents !== undefined) {
    return period.priceCents;
  }
  return period.amountCents ?? null;
}

export function periodDaysInclusive(startAt: Date, endAt: Date): number {
  const start = Date.UTC(
    startAt.getUTCFullYear(),
    startAt.getUTCMonth(),
    startAt.getUTCDate(),
  );
  const end = Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth(), endAt.getUTCDate());
  return Math.max(0, Math.round((end - start) / 86_400_000)) + 1;
}

export function formatPlanPeriodDuration(
  startAt: Date,
  endAt: Date | null,
  planType: string,
): string {
  if (!endAt) return "—";
  const days = periodDaysInclusive(startAt, endAt);
  if (planType === "Monthly Paid" && days >= 28 && days <= 31) {
    return "1 month";
  }
  if (planType === "Yearly Paid" && days >= 360) {
    return "1 year";
  }
  if (planType === "Free Trial" && days === 31) {
    return "30 days";
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function summarizePlanUsage(periods: ReviewPlanUsagePeriod[]) {
  const sorted = [...periods].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const totalPeriods = sorted.length;
  let totalPaidCents = 0;
  let totalUsageDays = 0;

  for (const period of sorted) {
    const price = resolvePeriodPriceCents(period) ?? 0;
    if (price > 0) totalPaidCents += price;
    if (period.endAt) {
      totalUsageDays += periodDaysInclusive(period.startAt, period.endAt);
    }
  }

  const activePeriod =
    sorted.find((period) => period.status === "Active") ??
    sorted.find((period) => period.status !== "Replaced" && period.status !== "Stopped") ??
    null;

  const activeLabel = activePeriod
    ? `${activePeriod.planType} · ${formatDateOnlyMYT(activePeriod.startAt)} → ${activePeriod.endAt ? formatDateOnlyMYT(activePeriod.endAt) : "—"}`
    : "—";

  return {
    sorted,
    totalPeriods,
    totalPaidLabel: formatRmFromCents(totalPaidCents, "MYR"),
    activeLabel,
    totalUsageDaysLabel:
      totalUsageDays > 0 ? `${totalUsageDays} day${totalUsageDays === 1 ? "" : "s"}` : "—",
  };
}
