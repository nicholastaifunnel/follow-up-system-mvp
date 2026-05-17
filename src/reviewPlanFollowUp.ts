import type { Prisma } from "@prisma/client";
import type { ReviewFollowUpReason, ReviewPlanType } from "./reviewPlanConstants";
import type { ReviewTrialStatus } from "./reviewTrialConstants";
import {
  addUtcDays,
  dateOnlyUtc,
  reviewTrialDaysUntilEnd,
  startOfTodayUtc,
} from "./reviewTrialStatus";

export type ReviewPlanLeadFields = {
  reviewTrialStatus: string | null;
  reviewTrialStartAt: Date | null;
  reviewTrialEndAt: Date | null;
  reviewPlanType: string | null;
  reviewTrialCheckInSentAt: Date | null;
  reviewRenewalReminderSentAt: Date | null;
  reviewExpiredReminder1SentAt: Date | null;
  reviewExpiredFollowUp1SentAt: Date | null;
  reviewExpiredFollowUp2SentAt: Date | null;
};

export type ReviewTrialsFilterKey =
  | "all"
  | "trial-check-in"
  | "trial-expiring"
  | "monthly-renewal"
  | "yearly-renewal"
  | "paid-active"
  | "expired"
  | "stopped"
  | "converted";

const TRIAL_CHECK_IN_MIN_DAY = 12;
const TRIAL_CHECK_IN_MAX_DAY = 16;
const TRIAL_EXPIRING_DAYS = 7;
const MONTHLY_RENEWAL_DAYS = 7;
const YEARLY_RENEWAL_DAYS = 30;

export function computePlanEndDate(startAt: Date, planType: ReviewPlanType): Date {
  const start = dateOnlyUtc(startAt);
  if (planType === "Free Trial") {
    return addUtcDays(start, 30);
  }
  if (planType === "Monthly Paid") {
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return end;
  }
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}

export function resolveReviewPlanType(lead: ReviewPlanLeadFields): ReviewPlanType | null {
  if (
    lead.reviewPlanType === "Free Trial" ||
    lead.reviewPlanType === "Monthly Paid" ||
    lead.reviewPlanType === "Yearly Paid"
  ) {
    return lead.reviewPlanType;
  }
  if (lead.reviewTrialStartAt && lead.reviewTrialEndAt) {
    return "Free Trial";
  }
  return null;
}

export function reviewTrialDaysSinceStart(
  startAt: Date | null,
  today = startOfTodayUtc(),
): number | null {
  if (!startAt) return null;
  const start = dateOnlyUtc(startAt);
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}

export function computeReviewPlanDisplayStatus(
  lead: ReviewPlanLeadFields,
  today = startOfTodayUtc(),
): ReviewTrialStatus {
  if (lead.reviewTrialStatus === "Stopped") return "Stopped";
  if (lead.reviewTrialStatus === "Converted Paid") return "Converted Paid";

  const planType = resolveReviewPlanType(lead);
  if (!lead.reviewTrialStartAt || !lead.reviewTrialEndAt) return "Not Started";

  const daysLeft = reviewTrialDaysUntilEnd(lead.reviewTrialEndAt, today);
  if (daysLeft === null) return "Not Started";

  if (planType === "Monthly Paid" || planType === "Yearly Paid") {
    if (daysLeft < 0) return "Trial Expired";
    return "Paid Active";
  }

  if (daysLeft < 0) return "Trial Expired";
  if (daysLeft <= TRIAL_EXPIRING_DAYS) return "Trial Expiring Soon";
  return "Trial Active";
}

export function computeReviewFollowUpReason(
  lead: ReviewPlanLeadFields,
  today = startOfTodayUtc(),
): ReviewFollowUpReason {
  if (lead.reviewTrialStatus === "Stopped" || lead.reviewTrialStatus === "Converted Paid") {
    return "No action needed";
  }

  const planType = resolveReviewPlanType(lead);
  const daysLeft = reviewTrialDaysUntilEnd(lead.reviewTrialEndAt, today);

  if (daysLeft !== null && daysLeft < 0) {
    if (!lead.reviewExpiredReminder1SentAt) return "Expired reminder 1 due";
    if (!lead.reviewExpiredFollowUp1SentAt) return "Expired follow-up 1 due";
    if (!lead.reviewExpiredFollowUp2SentAt) return "Expired follow-up 2 due";
    return "No action needed";
  }

  if (planType === "Free Trial" && lead.reviewTrialStartAt) {
    const daysSinceStart = reviewTrialDaysSinceStart(lead.reviewTrialStartAt, today);
    if (
      daysSinceStart !== null &&
      daysSinceStart >= TRIAL_CHECK_IN_MIN_DAY &&
      daysSinceStart <= TRIAL_CHECK_IN_MAX_DAY &&
      !lead.reviewTrialCheckInSentAt
    ) {
      return "Trial check-in due";
    }
    if (
      daysLeft !== null &&
      daysLeft >= 0 &&
      daysLeft <= TRIAL_EXPIRING_DAYS &&
      !lead.reviewRenewalReminderSentAt
    ) {
      return "Trial expiring soon";
    }
  }

  if (planType === "Monthly Paid" && daysLeft !== null && daysLeft >= 0 && daysLeft <= MONTHLY_RENEWAL_DAYS) {
    if (!lead.reviewRenewalReminderSentAt) return "Monthly renewal due";
  }

  if (planType === "Yearly Paid" && daysLeft !== null && daysLeft >= 0 && daysLeft <= YEARLY_RENEWAL_DAYS) {
    if (!lead.reviewRenewalReminderSentAt) return "Yearly renewal due";
  }

  return "No action needed";
}

export function reviewTrialStatusBadgeClass(status: ReviewTrialStatus | string | null): string {
  switch (status) {
    case "Trial Active":
      return "review-trial-badge review-trial-badge--active";
    case "Trial Expiring Soon":
      return "review-trial-badge review-trial-badge--expiring";
    case "Trial Expired":
      return "review-trial-badge review-trial-badge--expired";
    case "Paid Active":
      return "review-trial-badge review-trial-badge--paid-active";
    case "Converted Paid":
      return "review-trial-badge review-trial-badge--converted";
    case "Stopped":
      return "review-trial-badge review-trial-badge--stopped";
    default:
      return "review-trial-badge";
  }
}

function hasReviewTrackingData(): Prisma.LeadWhereInput {
  return {
    OR: [
      { reviewTrialStatus: { not: null } },
      { reviewTrialStartAt: { not: null } },
      { reviewTrialEndAt: { not: null } },
      { reviewPlanType: { not: null } },
    ],
  };
}

export function reviewTrialsFilterWhere(filter: ReviewTrialsFilterKey): Prisma.LeadWhereInput {
  switch (filter) {
    case "stopped":
      return { reviewTrialStatus: "Stopped" };
    case "converted":
      return { reviewTrialStatus: "Converted Paid" };
    case "all":
    default:
      return hasReviewTrackingData();
  }
}

export function matchesReviewTrialsFilter(
  lead: ReviewPlanLeadFields,
  filter: ReviewTrialsFilterKey,
  today = startOfTodayUtc(),
): boolean {
  if (filter === "all") return true;
  if (filter === "stopped") return lead.reviewTrialStatus === "Stopped";
  if (filter === "converted") return lead.reviewTrialStatus === "Converted Paid";

  const displayStatus = computeReviewPlanDisplayStatus(lead, today);
  const reason = computeReviewFollowUpReason(lead, today);

  switch (filter) {
    case "trial-check-in":
      return reason === "Trial check-in due";
    case "trial-expiring":
      return reason === "Trial expiring soon";
    case "monthly-renewal":
      return reason === "Monthly renewal due";
    case "yearly-renewal":
      return reason === "Yearly renewal due";
    case "paid-active":
      return displayStatus === "Paid Active";
    case "expired":
      return (
        displayStatus === "Trial Expired" ||
        reason === "Expired reminder 1 due" ||
        reason === "Expired follow-up 1 due" ||
        reason === "Expired follow-up 2 due"
      );
    default:
      return true;
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

export function canStartReviewTrial(status: ReviewTrialStatus): boolean {
  return status === "Not Started" || status === "Trial Expired" || status === "Stopped";
}

export function canStopReviewTrial(status: ReviewTrialStatus): boolean {
  return (
    status === "Trial Active" ||
    status === "Trial Expiring Soon" ||
    status === "Paid Active"
  );
}

/** @deprecated Use computeReviewPlanDisplayStatus */
export function computeReviewTrialDisplayStatus(
  lead: ReviewPlanLeadFields,
  today = startOfTodayUtc(),
): ReviewTrialStatus {
  return computeReviewPlanDisplayStatus(lead, today);
}
