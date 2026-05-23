import Link from "next/link";
import { formatDateOnlyMYT } from "@/formatMalaysiaTime";
import {
  computeReviewPlanDisplayStatus,
  getReviewPlanFollowUpState,
  resolveReviewPlanType,
  reviewTrialStatusBadgeClass,
} from "@/reviewPlanFollowUp";
import { REVIEW_FOLLOW_UP_ACTION_LABELS } from "@/reviewPlanConstants";
import { formatRmFromCents } from "@/money";
import { ReviewTrialsRowAction } from "./ReviewTrialsRowAction";

export type ReviewTrialsTableLead = {
  id: string;
  businessName: string;
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone?: string | null;
  contactPerson?: string | null;
  inboundSourceChannel?: string | null;
  adCampaignName?: string | null;
  landingPageVersion?: string | null;
  applyLinkName?: string | null;
  reviewTrialStatus: string | null;
  reviewTrialStartAt: Date | null;
  reviewTrialEndAt: Date | null;
  reviewPlanType: string | null;
  reviewPlanAmountCents: number | null;
  reviewPlanCurrency: string | null;
  reviewTrialCheckInSentAt: Date | null;
  reviewRenewalReminderSentAt: Date | null;
  reviewExpiredReminder1SentAt: Date | null;
  reviewExpiredFollowUp1SentAt: Date | null;
  reviewExpiredFollowUp2SentAt: Date | null;
  reviewPublicUrl: string | null;
  reviewMerchantUrl: string | null;
};

function fmtText(value: string | null): string {
  return value && value.trim() ? value : "—";
}

type Props = {
  leads: ReviewTrialsTableLead[];
  emptyMessage?: string;
};

export function ReviewTrialsTable({
  leads,
  emptyMessage = "No leads match this filter.",
}: Props) {
  if (leads.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="queue review-trials-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>WhatsApp</th>
            <th>Campaign / source</th>
            <th>LP / apply link</th>
            <th>Plan Type</th>
            <th>Status</th>
            <th>Plan End</th>
            <th>Due Date</th>
            <th>Next Follow-up</th>
            <th>Review Links</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const displayStatus = computeReviewPlanDisplayStatus(lead);
            const followUpState = getReviewPlanFollowUpState(lead);
            const planType = resolveReviewPlanType(lead) ?? "—";
            const nextFollowUpLabel = followUpState.nextActionKey
              ? REVIEW_FOLLOW_UP_ACTION_LABELS[followUpState.nextActionKey]
              : "—";

            return (
              <tr key={lead.id}>
                <td>{lead.businessName}</td>
                <td className="queue-td-phone">
                  {fmtText(lead.whatsappPhone ?? lead.phone ?? null)}
                  {lead.contactPerson ? (
                    <>
                      <br />
                      <span className="queue-muted">{lead.contactPerson}</span>
                    </>
                  ) : null}
                </td>
                <td className="queue-td-clip">
                  {fmtText(lead.adCampaignName ?? null)}
                  {lead.inboundSourceChannel ? (
                    <>
                      <br />
                      <span className="queue-muted">{lead.inboundSourceChannel}</span>
                    </>
                  ) : null}
                </td>
                <td className="queue-td-clip">
                  {fmtText(lead.landingPageVersion ?? null)}
                  {lead.applyLinkName ? (
                    <>
                      <br />
                      <span className="queue-muted">{lead.applyLinkName}</span>
                    </>
                  ) : null}
                </td>
                <td>
                  <div className="review-trials-plan-type-cell">
                    <span>{planType}</span>
                    <span className="review-trials-plan-price">
                      {formatRmFromCents(lead.reviewPlanAmountCents, lead.reviewPlanCurrency)}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={reviewTrialStatusBadgeClass(displayStatus)}>
                    {displayStatus}
                  </span>
                </td>
                <td>{formatDateOnlyMYT(lead.reviewTrialEndAt)}</td>
                <td>{formatDateOnlyMYT(followUpState.nextActionDueDate)}</td>
                <td className="review-follow-up-reason-cell">{nextFollowUpLabel}</td>
                <td className="review-trial-links-cell">
                  {lead.reviewPublicUrl || lead.reviewMerchantUrl ? (
                    <div className="review-trial-links-inner">
                      {lead.reviewPublicUrl ? (
                        <a
                          className="review-trial-link-badge"
                          href={lead.reviewPublicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Public
                        </a>
                      ) : null}
                      {lead.reviewMerchantUrl ? (
                        <a
                          className="review-trial-link-badge"
                          href={lead.reviewMerchantUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Admin
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="review-trial-action-cell">
                  <ReviewTrialsRowAction
                    leadId={lead.id}
                    nextActionKey={followUpState.nextActionKey}
                    nextActionLabel={followUpState.nextActionLabel}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
