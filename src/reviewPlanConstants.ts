export const REVIEW_PLAN_TYPES = [
  "Free Trial",
  "Monthly Paid",
  "Yearly Paid",
] as const;

export type ReviewPlanType = (typeof REVIEW_PLAN_TYPES)[number];

export function isReviewPlanType(value: string): value is ReviewPlanType {
  return REVIEW_PLAN_TYPES.includes(value as ReviewPlanType);
}

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
