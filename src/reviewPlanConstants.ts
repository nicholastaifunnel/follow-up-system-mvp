export const REVIEW_PLAN_TYPES = [
  "Free Trial",
  "Monthly Paid",
  "Yearly Paid",
] as const;

export type ReviewPlanType = (typeof REVIEW_PLAN_TYPES)[number];

export function isReviewPlanType(value: string): value is ReviewPlanType {
  return REVIEW_PLAN_TYPES.includes(value as ReviewPlanType);
}

export const DEFAULT_PLAN_AMOUNT_CENTS: Record<ReviewPlanType, number> = {
  "Free Trial": 0,
  "Monthly Paid": 2900,
  "Yearly Paid": 19900,
};

export function getDefaultPlanAmountCents(planType: ReviewPlanType): number {
  return DEFAULT_PLAN_AMOUNT_CENTS[planType];
}

export const REVIEW_PLAN_PERIOD_STATUSES = [
  "Active",
  "Completed",
  "Stopped",
  "Replaced",
] as const;

export type ReviewPlanPeriodStatus = (typeof REVIEW_PLAN_PERIOD_STATUSES)[number];

export const REVIEW_PLAN_PERIOD_SOURCES = [
  "Start Plan",
  "Renew Plan",
  "Manual Save",
] as const;

export type ReviewPlanPeriodSource = (typeof REVIEW_PLAN_PERIOD_SOURCES)[number];

export const REVIEW_FOLLOW_UP_REASONS = [
  "Trial check-in due",
  "Trial expiring soon",
  "Monthly renewal due",
  "Yearly renewal due",
  "Expired reminder 1 due",
  "Expired follow-up 1 due",
  "Expired follow-up 2 due",
  "No action needed",
] as const;

export type ReviewFollowUpReason = (typeof REVIEW_FOLLOW_UP_REASONS)[number];

export const REVIEW_FOLLOW_UP_ACTION_KEYS = [
  "trial-check-in",
  "renewal-reminder",
  "expired-reminder-1",
  "expired-follow-up-1",
  "expired-follow-up-2",
] as const;

export type ReviewFollowUpActionKey = (typeof REVIEW_FOLLOW_UP_ACTION_KEYS)[number];

export const REVIEW_FOLLOW_UP_ITEM_STATUSES = ["Due", "Not Due", "Sent"] as const;

export type ReviewFollowUpItemStatus = (typeof REVIEW_FOLLOW_UP_ITEM_STATUSES)[number];

export const REVIEW_FOLLOW_UP_ACTION_LABELS: Record<ReviewFollowUpActionKey, string> = {
  "trial-check-in": "Trial check-in",
  "renewal-reminder": "Renewal reminder",
  "expired-reminder-1": "Expired reminder 1",
  "expired-follow-up-1": "Expired follow-up 1",
  "expired-follow-up-2": "Expired follow-up 2",
};

export const REVIEW_FOLLOW_UP_MARK_LABELS: Record<ReviewFollowUpActionKey, string> = {
  "trial-check-in": "Mark Check-in Sent",
  "renewal-reminder": "Mark Renewal Sent",
  "expired-reminder-1": "Mark Expired Reminder Sent",
  "expired-follow-up-1": "Mark Expired Follow-up 1 Sent",
  "expired-follow-up-2": "Mark Expired Follow-up 2 Sent",
};

export const REVIEW_FOLLOW_UP_DRAFT_FIELDS = {
  "trial-check-in": "reviewTrialCheckInDraft",
  "renewal-reminder": "reviewRenewalReminderDraft",
  "expired-reminder-1": "reviewExpiredReminder1Draft",
  "expired-follow-up-1": "reviewExpiredFollowUp1Draft",
  "expired-follow-up-2": "reviewExpiredFollowUp2Draft",
} as const satisfies Record<ReviewFollowUpActionKey, string>;

export const REVIEW_FOLLOW_UP_SENT_FIELDS = {
  "trial-check-in": "reviewTrialCheckInSentAt",
  "renewal-reminder": "reviewRenewalReminderSentAt",
  "expired-reminder-1": "reviewExpiredReminder1SentAt",
  "expired-follow-up-1": "reviewExpiredFollowUp1SentAt",
  "expired-follow-up-2": "reviewExpiredFollowUp2SentAt",
} as const satisfies Record<ReviewFollowUpActionKey, string>;
