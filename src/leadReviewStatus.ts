export const LEAD_REVIEW_NEEDS_REVIEW = "Needs Review";
export const LEAD_REVIEW_APPROVED = "Ready";
export const LEAD_REVIEW_NEED_MORE_INFO = "Need More Info";
export const LEAD_REVIEW_REJECTED = "Rejected";

export const LEAD_REVIEW_STATUSES = [
  LEAD_REVIEW_NEEDS_REVIEW,
  LEAD_REVIEW_APPROVED,
  LEAD_REVIEW_NEED_MORE_INFO,
  LEAD_REVIEW_REJECTED,
] as const;

export type LeadReviewStatus = (typeof LEAD_REVIEW_STATUSES)[number];

export function isLeadReviewStatus(value: string): value is LeadReviewStatus {
  return LEAD_REVIEW_STATUSES.includes(value as LeadReviewStatus);
}

export function leadReviewStatusLabel(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) return LEAD_REVIEW_NEEDS_REVIEW;
  if (normalized === LEAD_REVIEW_APPROVED) return "Approved";
  return normalized;
}

export function canEnterFirstOutreach(value: string | null | undefined): boolean {
  return value === LEAD_REVIEW_APPROVED;
}
