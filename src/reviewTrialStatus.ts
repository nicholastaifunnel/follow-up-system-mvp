import type { Prisma } from "@prisma/client";
import type { ReviewTrialStatus } from "./reviewTrialConstants";

export type ReviewTrialLeadFields = {
  reviewTrialStatus: string | null;
  reviewTrialStartAt: Date | null;
  reviewTrialEndAt: Date | null;
};

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
export function reviewTrialDaysUntilEnd(endAt: Date | null, today = startOfTodayUtc()): number | null {
  if (!endAt) return null;
  const end = dateOnlyUtc(endAt);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export function computeReviewTrialDisplayStatus(
  lead: ReviewTrialLeadFields,
  today = startOfTodayUtc(),
): ReviewTrialStatus {
  if (lead.reviewTrialStatus === "Stopped") return "Stopped";
  if (lead.reviewTrialStatus === "Converted Paid") return "Converted Paid";
  if (!lead.reviewTrialStartAt || !lead.reviewTrialEndAt) return "Not Started";

  const daysLeft = reviewTrialDaysUntilEnd(lead.reviewTrialEndAt, today);
  if (daysLeft === null) return "Not Started";
  if (daysLeft < 0) return "Trial Expired";
  if (daysLeft <= 7) return "Trial Expiring Soon";
  return "Trial Active";
}

export function reviewTrialStatusBadgeClass(status: ReviewTrialStatus | string | null): string {
  switch (status) {
    case "Trial Active":
      return "review-trial-badge review-trial-badge--active";
    case "Trial Expiring Soon":
      return "review-trial-badge review-trial-badge--expiring";
    case "Trial Expired":
      return "review-trial-badge review-trial-badge--expired";
    case "Converted Paid":
      return "review-trial-badge review-trial-badge--converted";
    case "Stopped":
      return "review-trial-badge review-trial-badge--stopped";
    default:
      return "review-trial-badge";
  }
}

export function canStartReviewTrial(status: ReviewTrialStatus): boolean {
  return (
    status === "Not Started" ||
    status === "Trial Expired" ||
    status === "Stopped"
  );
}

export function canStopReviewTrial(status: ReviewTrialStatus): boolean {
  return status === "Trial Active" || status === "Trial Expiring Soon";
}

function trialDateExclusions(): Prisma.LeadWhereInput {
  return {
    NOT: [{ reviewTrialStatus: "Stopped" }, { reviewTrialStatus: "Converted Paid" }],
  };
}

export type ReviewTrialsFilterKey =
  | "all"
  | "active"
  | "expiring"
  | "expired"
  | "converted"
  | "stopped";

export function reviewTrialsFilterWhere(
  filter: ReviewTrialsFilterKey,
  today = startOfTodayUtc(),
): Prisma.LeadWhereInput {
  const inSevenDays = addUtcDays(today, 7);

  switch (filter) {
    case "stopped":
      return { reviewTrialStatus: "Stopped" };
    case "converted":
      return { reviewTrialStatus: "Converted Paid" };
    case "active":
      return {
        AND: [
          trialDateExclusions(),
          { reviewTrialStartAt: { not: null } },
          { reviewTrialEndAt: { not: null, gt: inSevenDays } },
        ],
      };
    case "expiring":
      return {
        AND: [
          trialDateExclusions(),
          { reviewTrialStartAt: { not: null } },
          { reviewTrialEndAt: { gte: today, lte: inSevenDays } },
        ],
      };
    case "expired":
      return {
        AND: [
          trialDateExclusions(),
          { reviewTrialStartAt: { not: null } },
          { reviewTrialEndAt: { not: null, lt: today } },
        ],
      };
    case "all":
    default:
      return {
        OR: [
          { reviewTrialStatus: { not: null } },
          { reviewTrialStartAt: { not: null } },
          { reviewTrialEndAt: { not: null } },
        ],
      };
  }
}

export function formatReviewTrialDaysLeft(endAt: Date | null, today = startOfTodayUtc()): string {
  const daysLeft = reviewTrialDaysUntilEnd(endAt, today);
  if (daysLeft === null) return "—";
  if (daysLeft > 0) return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  if (daysLeft === 0) return "Ends today";
  const expired = Math.abs(daysLeft);
  return `Expired ${expired} day${expired === 1 ? "" : "s"} ago`;
}
