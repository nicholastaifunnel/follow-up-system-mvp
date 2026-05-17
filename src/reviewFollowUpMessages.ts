import { formatDateOnlyMYT } from "./formatMalaysiaTime";
import type { ReviewFollowUpActionKey } from "./reviewPlanConstants";
import { reviewPlanDaysUntilEndMYT } from "./reviewPlanFollowUp";

export type ReviewFollowUpMessageLead = {
  businessName: string;
  area: string | null;
  reviewCount: number | null;
  googleRating: number | null;
  reviewPlanType: string | null;
  reviewTrialStartAt: Date | null;
  reviewTrialEndAt: Date | null;
  reviewPublicUrl: string | null;
  reviewMerchantUrl: string | null;
};

const TEMPLATES: Record<ReviewFollowUpActionKey, string> = {
  "trial-check-in": `Hi {businessName}, quick check-in on your review system.

How is the QR review flow going so far? Any issue on your side?`,
  "renewal-reminder": `Hi {businessName}, your {planType} review plan ends around {planEndDate} ({daysLeft}).

Want to continue after this? I can keep your review link / QR flow active.`,
  "expired-reminder-1": `Hi {businessName}, your review plan has ended ({planEndDate}).

Still want to continue the review system? If yes I can turn it back on. If not, I will stop it.`,
  "expired-follow-up-1": `Hi {businessName}, just following up on the review system renewal.

If you still want it, I can keep it on. If not, no problem — just let me know.`,
  "expired-follow-up-2": `Hi {businessName}, last follow-up from me on the review system.

If now is not the right time, it's okay — I will leave it stopped for now.`,
};

function formatDaysLeft(endAt: Date | null): string {
  const days = reviewPlanDaysUntilEndMYT(endAt);
  if (days === null) return "";
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} left`;
  if (days === 0) return "ends today";
  const expired = Math.abs(days);
  return `expired ${expired} day${expired === 1 ? "" : "s"} ago`;
}

function formatRating(rating: number | null): string {
  if (rating == null || Number.isNaN(rating)) return "";
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

function resolvePlanTypeLabel(lead: ReviewFollowUpMessageLead): string {
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
  return lead.reviewPlanType ?? "review plan";
}

function buildVariables(lead: ReviewFollowUpMessageLead): Record<string, string> {
  const planType = resolvePlanTypeLabel(lead);
  const rating = formatRating(lead.googleRating);
  const reviews =
    lead.reviewCount != null ? String(lead.reviewCount) : "";

  return {
    businessName: lead.businessName.trim() || "there",
    planType,
    planEndDate: formatDateOnlyMYT(lead.reviewTrialEndAt),
    reviewPublicUrl: lead.reviewPublicUrl?.trim() ?? "",
    reviewMerchantUrl: lead.reviewMerchantUrl?.trim() ?? "",
    daysLeft: formatDaysLeft(lead.reviewTrialEndAt),
    area: lead.area?.trim() ?? "",
    reviewCount: reviews,
    googleRating: rating,
  };
}

function applyVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export function buildReviewFollowUpMessage(
  followUpType: ReviewFollowUpActionKey,
  lead: ReviewFollowUpMessageLead,
): string {
  return applyVariables(TEMPLATES[followUpType], buildVariables(lead)).trim();
}

export function isReviewFollowUpActionKey(
  value: string,
): value is ReviewFollowUpActionKey {
  return (
    value === "trial-check-in" ||
    value === "renewal-reminder" ||
    value === "expired-reminder-1" ||
    value === "expired-follow-up-1" ||
    value === "expired-follow-up-2"
  );
}
