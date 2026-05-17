export const REVIEW_TRIAL_STATUSES = [
  "Not Started",
  "Trial Active",
  "Trial Expiring Soon",
  "Trial Expired",
  "Paid Active",
  "Converted Paid",
  "Stopped",
] as const;

export type ReviewTrialStatus = (typeof REVIEW_TRIAL_STATUSES)[number];

export function isReviewTrialStatus(value: string): value is ReviewTrialStatus {
  return REVIEW_TRIAL_STATUSES.includes(value as ReviewTrialStatus);
}
