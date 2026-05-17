import type { Prisma } from "@prisma/client";
import { getMalaysiaDateParts } from "./formatMalaysiaTime";
import type {
  ReviewFollowUpActionKey,
  ReviewFollowUpItemStatus,
  ReviewFollowUpReason,
  ReviewPlanType,
} from "./reviewPlanConstants";
import {
  REVIEW_FOLLOW_UP_ACTION_LABELS,
  REVIEW_FOLLOW_UP_MARK_LABELS,
} from "./reviewPlanConstants";
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
  | "need-follow-up"
  | "trial-check-in"
  | "trial-expiring"
  | "monthly-renewal"
  | "yearly-renewal"
  | "expired-follow-up"
  | "paid-active"
  | "stopped"
  | "converted"
  | "all";

export type ReviewFollowUpItem = {
  actionKey: ReviewFollowUpActionKey;
  label: string;
  dueDate: Date | null;
  status: ReviewFollowUpItemStatus;
  sentAt: Date | null;
};

export type ReviewPlanFollowUpState = {
  nextActionKey: ReviewFollowUpActionKey | null;
  nextActionLabel: string | null;
  nextActionDueDate: Date | null;
  nextActionReason: ReviewFollowUpReason;
  followUpItems: ReviewFollowUpItem[];
};

const TRIAL_EXPIRING_DAYS = 7;
const FOLLOW_UP_ACTION_ORDER: ReviewFollowUpActionKey[] = [
  "trial-check-in",
  "renewal-reminder",
  "expired-reminder-1",
  "expired-follow-up-1",
  "expired-follow-up-2",
];

const REASON_BY_ACTION: Record<ReviewFollowUpActionKey, ReviewFollowUpReason> = {
  "trial-check-in": "Trial check-in due",
  "renewal-reminder": "Trial expiring soon",
  "expired-reminder-1": "Expired reminder 1 due",
  "expired-follow-up-1": "Expired follow-up 1 due",
  "expired-follow-up-2": "Expired follow-up 2 due",
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function malaysiaDateKey(date: Date): number {
  const { year, month, day } = getMalaysiaDateParts(date);
  return year * 10_000 + month * 100 + day;
}

export function addMalaysiaCalendarDays(base: Date, days: number): Date {
  const { year, month, day } = getMalaysiaDateParts(base);
  const anchor = new Date(`${year}-${pad2(month)}-${pad2(day)}T12:00:00+08:00`);
  const shifted = new Date(anchor.getTime() + days * 86_400_000);
  const target = getMalaysiaDateParts(shifted);
  return new Date(
    `${target.year}-${pad2(target.month)}-${pad2(target.day)}T00:00:00+08:00`,
  );
}

export function reviewPlanDaysUntilEndMYT(
  endAt: Date | null,
  now = new Date(),
): number | null {
  if (!endAt) return null;
  const end = addMalaysiaCalendarDays(endAt, 0);
  const today = addMalaysiaCalendarDays(now, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

function isPlanExpiredMYT(endAt: Date | null, now = new Date()): boolean {
  if (!endAt) return false;
  return malaysiaDateKey(now) > malaysiaDateKey(endAt);
}

function isPlanEndedOrEndingMYT(endAt: Date | null, now = new Date()): boolean {
  if (!endAt) return false;
  return malaysiaDateKey(now) >= malaysiaDateKey(endAt);
}

function resolveItemStatus(
  sentAt: Date | null,
  dueDate: Date | null,
  prerequisiteSent: boolean,
  now = new Date(),
): ReviewFollowUpItemStatus {
  if (sentAt) return "Sent";
  if (!dueDate || !prerequisiteSent) return "Not Due";
  if (malaysiaDateKey(now) >= malaysiaDateKey(dueDate)) return "Due";
  return "Not Due";
}

function isReviewPlanInactive(lead: ReviewPlanLeadFields): boolean {
  return (
    lead.reviewTrialStatus === "Stopped" ||
    lead.reviewTrialStatus === "Converted Paid"
  );
}

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

export function getReviewPlanFollowUpState(
  lead: ReviewPlanLeadFields,
  now = new Date(),
): ReviewPlanFollowUpState {
  const planType = resolveReviewPlanType(lead);
  const expired = isPlanExpiredMYT(lead.reviewTrialEndAt, now);
  const endedOrEnding = isPlanEndedOrEndingMYT(lead.reviewTrialEndAt, now);
  const inactive = isReviewPlanInactive(lead);
  const hasPlanDates = Boolean(lead.reviewTrialStartAt && lead.reviewTrialEndAt);

  const trialCheckInDueDate =
    planType === "Free Trial" && lead.reviewTrialStartAt
      ? addMalaysiaCalendarDays(lead.reviewTrialStartAt, 14)
      : null;

  const renewalDueDate = lead.reviewTrialEndAt
    ? addMalaysiaCalendarDays(lead.reviewTrialEndAt, -7)
    : null;

  const expiredReminder1DueDate = lead.reviewTrialEndAt
    ? addMalaysiaCalendarDays(lead.reviewTrialEndAt, 0)
    : null;

  const expiredFollowUp1DueDate = lead.reviewExpiredReminder1SentAt
    ? addMalaysiaCalendarDays(lead.reviewExpiredReminder1SentAt, 2)
    : null;

  const expiredFollowUp2DueDate = lead.reviewExpiredFollowUp1SentAt
    ? addMalaysiaCalendarDays(lead.reviewExpiredFollowUp1SentAt, 3)
    : null;

  const trialCheckInApplicable =
    !inactive && hasPlanDates && planType === "Free Trial" && !expired;

  const renewalApplicable =
    !inactive &&
    hasPlanDates &&
    (planType === "Free Trial" ||
      planType === "Monthly Paid" ||
      planType === "Yearly Paid") &&
    !expired;

  const expiredChainApplicable = !inactive && hasPlanDates && endedOrEnding;

  const trialCheckInStatus: ReviewFollowUpItemStatus = inactive
    ? "Not Due"
    : resolveItemStatus(
        lead.reviewTrialCheckInSentAt,
        trialCheckInDueDate,
        trialCheckInApplicable,
        now,
      );

  const renewalStatus: ReviewFollowUpItemStatus = inactive
    ? "Not Due"
    : resolveItemStatus(
        lead.reviewRenewalReminderSentAt,
        renewalDueDate,
        renewalApplicable,
        now,
      );

  const expiredReminder1Status: ReviewFollowUpItemStatus = inactive
    ? "Not Due"
    : resolveItemStatus(
        lead.reviewExpiredReminder1SentAt,
        expiredReminder1DueDate,
        expiredChainApplicable,
        now,
      );

  const expiredFollowUp1Status: ReviewFollowUpItemStatus = inactive
    ? "Not Due"
    : resolveItemStatus(
        lead.reviewExpiredFollowUp1SentAt,
        expiredFollowUp1DueDate,
        expiredChainApplicable && Boolean(lead.reviewExpiredReminder1SentAt),
        now,
      );

  const expiredFollowUp2Status: ReviewFollowUpItemStatus = inactive
    ? "Not Due"
    : resolveItemStatus(
        lead.reviewExpiredFollowUp2SentAt,
        expiredFollowUp2DueDate,
        expiredChainApplicable && Boolean(lead.reviewExpiredFollowUp1SentAt),
        now,
      );

  const followUpItems: ReviewFollowUpItem[] = [
    {
      actionKey: "trial-check-in",
      label: REVIEW_FOLLOW_UP_ACTION_LABELS["trial-check-in"],
      dueDate: trialCheckInDueDate,
      status: trialCheckInStatus,
      sentAt: lead.reviewTrialCheckInSentAt,
    },
    {
      actionKey: "renewal-reminder",
      label: REVIEW_FOLLOW_UP_ACTION_LABELS["renewal-reminder"],
      dueDate: renewalDueDate,
      status: renewalStatus,
      sentAt: lead.reviewRenewalReminderSentAt,
    },
    {
      actionKey: "expired-reminder-1",
      label: REVIEW_FOLLOW_UP_ACTION_LABELS["expired-reminder-1"],
      dueDate: expiredReminder1DueDate,
      status: expiredReminder1Status,
      sentAt: lead.reviewExpiredReminder1SentAt,
    },
    {
      actionKey: "expired-follow-up-1",
      label: REVIEW_FOLLOW_UP_ACTION_LABELS["expired-follow-up-1"],
      dueDate: expiredFollowUp1DueDate,
      status: expiredFollowUp1Status,
      sentAt: lead.reviewExpiredFollowUp1SentAt,
    },
    {
      actionKey: "expired-follow-up-2",
      label: REVIEW_FOLLOW_UP_ACTION_LABELS["expired-follow-up-2"],
      dueDate: expiredFollowUp2DueDate,
      status: expiredFollowUp2Status,
      sentAt: lead.reviewExpiredFollowUp2SentAt,
    },
  ];

  const dueItems = FOLLOW_UP_ACTION_ORDER.map((key) =>
    followUpItems.find((item) => item.actionKey === key),
  ).filter((item): item is ReviewFollowUpItem => Boolean(item && item.status === "Due"));

  const nextItem = dueItems[0] ?? null;
  const nextActionKey = nextItem?.actionKey ?? null;
  const nextActionLabel = nextActionKey
    ? REVIEW_FOLLOW_UP_MARK_LABELS[nextActionKey]
    : null;

  let nextActionReason: ReviewFollowUpReason = "No action needed";
  if (nextActionKey) {
    if (nextActionKey === "renewal-reminder") {
      if (planType === "Monthly Paid") nextActionReason = "Monthly renewal due";
      else if (planType === "Yearly Paid") nextActionReason = "Yearly renewal due";
      else nextActionReason = "Trial expiring soon";
    } else {
      nextActionReason = REASON_BY_ACTION[nextActionKey];
    }
  }

  return {
    nextActionKey,
    nextActionLabel,
    nextActionDueDate: nextItem?.dueDate ?? null,
    nextActionReason,
    followUpItems,
  };
}

export function computeReviewFollowUpReason(
  lead: ReviewPlanLeadFields,
  now = new Date(),
): ReviewFollowUpReason {
  return getReviewPlanFollowUpState(lead, now).nextActionReason;
}

export function isFollowUpUpcomingSoon(
  item: ReviewFollowUpItem,
  now = new Date(),
): boolean {
  if (item.status === "Sent" || !item.dueDate) return false;
  const todayKey = malaysiaDateKey(now);
  const dueKey = malaysiaDateKey(item.dueDate);
  if (dueKey <= todayKey) return false;
  const upcomingEndKey = malaysiaDateKey(addMalaysiaCalendarDays(now, 7));
  return dueKey <= upcomingEndKey;
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
    case "need-follow-up":
    default:
      return hasReviewTrackingData();
  }
}

export function matchesReviewTrialsFilter(
  lead: ReviewPlanLeadFields,
  filter: ReviewTrialsFilterKey,
  now = new Date(),
): boolean {
  if (filter === "all") return true;
  if (filter === "stopped") return lead.reviewTrialStatus === "Stopped";
  if (filter === "converted") return lead.reviewTrialStatus === "Converted Paid";

  const displayStatus = computeReviewPlanDisplayStatus(lead);
  const state = getReviewPlanFollowUpState(lead, now);
  const planType = resolveReviewPlanType(lead);
  const daysLeft = reviewPlanDaysUntilEndMYT(lead.reviewTrialEndAt, now);
  const checkIn = state.followUpItems.find((item) => item.actionKey === "trial-check-in");
  const expiredItems = state.followUpItems.filter((item) =>
    item.actionKey.startsWith("expired-"),
  );

  switch (filter) {
    case "need-follow-up":
      return state.nextActionKey !== null;
    case "trial-check-in":
      return (
        planType === "Free Trial" &&
        !lead.reviewTrialCheckInSentAt &&
        checkIn !== undefined &&
        (checkIn.status === "Due" || checkIn.status === "Not Due")
      );
    case "trial-expiring":
      return (
        planType === "Free Trial" &&
        daysLeft !== null &&
        daysLeft >= 0 &&
        daysLeft <= TRIAL_EXPIRING_DAYS &&
        !lead.reviewRenewalReminderSentAt
      );
    case "monthly-renewal":
      return (
        planType === "Monthly Paid" &&
        !lead.reviewRenewalReminderSentAt &&
        daysLeft !== null &&
        daysLeft >= 0 &&
        daysLeft <= TRIAL_EXPIRING_DAYS
      );
    case "yearly-renewal":
      return (
        planType === "Yearly Paid" &&
        !lead.reviewRenewalReminderSentAt &&
        daysLeft !== null &&
        daysLeft >= 0 &&
        daysLeft <= TRIAL_EXPIRING_DAYS
      );
    case "paid-active":
      return displayStatus === "Paid Active" && state.nextActionKey === null;
    case "expired-follow-up":
      return (
        displayStatus === "Trial Expired" &&
        expiredItems.some((item) => item.status === "Due" || !item.sentAt)
      );
    default:
      return true;
  }
}

export type ReviewDailyWorkBucket =
  | "overdue"
  | "due-today"
  | "upcoming-soon"
  | "no-action-needed";

export const REVIEW_DAILY_WORK_BUCKETS: ReviewDailyWorkBucket[] = [
  "overdue",
  "due-today",
  "upcoming-soon",
  "no-action-needed",
];

export const REVIEW_DAILY_WORK_LABELS: Record<ReviewDailyWorkBucket, string> = {
  overdue: "Overdue",
  "due-today": "Due Today / Need Action Now",
  "upcoming-soon": "Upcoming Soon",
  "no-action-needed": "No Action Needed",
};

/** One bucket per lead for Daily Work sections (MYT due dates). */
export function getReviewDailyWorkBucket(
  lead: ReviewPlanLeadFields,
  now = new Date(),
): ReviewDailyWorkBucket {
  const state = getReviewPlanFollowUpState(lead, now);

  if (!state.nextActionKey || !state.nextActionDueDate) {
    return "no-action-needed";
  }

  const todayKey = malaysiaDateKey(now);
  const dueKey = malaysiaDateKey(state.nextActionDueDate);
  const upcomingEndKey = malaysiaDateKey(addMalaysiaCalendarDays(now, 7));

  if (dueKey < todayKey) return "overdue";
  if (dueKey === todayKey) return "due-today";
  if (dueKey > todayKey && dueKey <= upcomingEndKey) return "upcoming-soon";
  return "no-action-needed";
}

export type ReviewLeadActivityFields = ReviewPlanLeadFields & {
  reviewTrialUpdatedAt?: Date | null;
  updatedAt?: Date;
  createdAt?: Date;
};

export function getReviewLeadLastActivityAt(
  lead: ReviewLeadActivityFields,
): Date | null {
  const candidates = [
    lead.reviewTrialUpdatedAt,
    lead.reviewTrialCheckInSentAt,
    lead.reviewRenewalReminderSentAt,
    lead.reviewExpiredReminder1SentAt,
    lead.reviewExpiredFollowUp1SentAt,
    lead.reviewExpiredFollowUp2SentAt,
    lead.updatedAt,
    lead.createdAt,
  ].filter((value): value is Date => value != null);

  if (candidates.length === 0) return null;
  return candidates.reduce((latest, value) =>
    value.getTime() > latest.getTime() ? value : latest,
  );
}

/** Main Review customers list only — most recent activity first. */
export function sortReviewLeadsByRecentActivity<T extends ReviewLeadActivityFields>(
  leads: T[],
): T[] {
  return [...leads].sort((a, b) => {
    const timeA = getReviewLeadLastActivityAt(a)?.getTime() ?? 0;
    const timeB = getReviewLeadLastActivityAt(b)?.getTime() ?? 0;
    if (timeB !== timeA) return timeB - timeA;
    return 0;
  });
}

function compareDailyWorkLeads(
  a: ReviewPlanLeadFields,
  b: ReviewPlanLeadFields,
  bucket: ReviewDailyWorkBucket,
  now: Date,
): number {
  const stateA = getReviewPlanFollowUpState(a, now);
  const stateB = getReviewPlanFollowUpState(b, now);
  const dueA = stateA.nextActionDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const dueB = stateB.nextActionDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

  if (bucket === "overdue") {
    return dueA - dueB;
  }
  if (bucket === "due-today" || bucket === "upcoming-soon") {
    return dueA - dueB;
  }

  const endA = a.reviewTrialEndAt?.getTime() ?? 0;
  const endB = b.reviewTrialEndAt?.getTime() ?? 0;
  return endB - endA;
}

export function bucketReviewDailyWorkLeads<T extends ReviewPlanLeadFields>(
  leads: T[],
  now = new Date(),
): Record<ReviewDailyWorkBucket, T[]> {
  const buckets: Record<ReviewDailyWorkBucket, T[]> = {
    overdue: [],
    "due-today": [],
    "upcoming-soon": [],
    "no-action-needed": [],
  };

  for (const lead of leads) {
    const bucket = getReviewDailyWorkBucket(lead, now);
    buckets[bucket].push(lead);
  }

  for (const bucket of REVIEW_DAILY_WORK_BUCKETS) {
    buckets[bucket].sort((a, b) => compareDailyWorkLeads(a, b, bucket, now));
  }

  return buckets;
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

export type ReviewCustomerOverviewCounts = {
  freeTrialActive: number;
  freeTrialExpired: number;
  monthlyPaidActive: number;
  yearlyPaidActive: number;
  stopped: number;
  convertedPaid: number;
  needFollowUp: number;
};

export function summarizeReviewCustomerOverview(
  leads: ReviewPlanLeadFields[],
  now = new Date(),
): ReviewCustomerOverviewCounts {
  const counts: ReviewCustomerOverviewCounts = {
    freeTrialActive: 0,
    freeTrialExpired: 0,
    monthlyPaidActive: 0,
    yearlyPaidActive: 0,
    stopped: 0,
    convertedPaid: 0,
    needFollowUp: 0,
  };

  for (const lead of leads) {
    const displayStatus = computeReviewPlanDisplayStatus(lead);
    const planType = resolveReviewPlanType(lead);

    if (displayStatus === "Stopped") {
      counts.stopped += 1;
    }
    if (displayStatus === "Converted Paid") {
      counts.convertedPaid += 1;
    }
    if (planType === "Free Trial") {
      if (displayStatus === "Trial Active" || displayStatus === "Trial Expiring Soon") {
        counts.freeTrialActive += 1;
      } else if (displayStatus === "Trial Expired") {
        counts.freeTrialExpired += 1;
      }
    }
    if (planType === "Monthly Paid" && displayStatus === "Paid Active") {
      counts.monthlyPaidActive += 1;
    }
    if (planType === "Yearly Paid" && displayStatus === "Paid Active") {
      counts.yearlyPaidActive += 1;
    }
    if (matchesReviewTrialsFilter(lead, "need-follow-up", now)) {
      counts.needFollowUp += 1;
    }
  }

  return counts;
}
