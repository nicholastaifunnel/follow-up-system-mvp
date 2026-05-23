export const AD_LEAD_PENDING = "Pending";
export const AD_LEAD_NEED_MORE_INFO = "Need More Info";
export const AD_LEAD_APPROVED = "Approved";
export const AD_LEAD_REJECTED = "Rejected";

export const AD_LEAD_STATUSES = [
  AD_LEAD_PENDING,
  AD_LEAD_NEED_MORE_INFO,
  AD_LEAD_APPROVED,
  AD_LEAD_REJECTED,
] as const;

export type AdLeadStatus = (typeof AD_LEAD_STATUSES)[number];

export function isAdLeadStatus(value: string): value is AdLeadStatus {
  return AD_LEAD_STATUSES.includes(value as AdLeadStatus);
}

/** Excludes ad trial intake leads from cold outreach / Excel review inbox. */
export function isAdTrialIntakeLead(lead: {
  trialRequestedAt?: Date | null;
}): boolean {
  return lead.trialRequestedAt != null;
}
