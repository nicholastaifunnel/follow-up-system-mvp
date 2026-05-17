import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computeReviewFollowUpReason,
  computeReviewPlanDisplayStatus,
  formatReviewTrialDaysLeft,
  matchesReviewTrialsFilter,
  resolveReviewPlanType,
  reviewTrialStatusBadgeClass,
  reviewTrialsFilterWhere,
  type ReviewTrialsFilterKey,
} from "@/reviewPlanFollowUp";

export const dynamic = "force-dynamic";

const FILTERS: { key: ReviewTrialsFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "trial-check-in", label: "Trial Check-in" },
  { key: "trial-expiring", label: "Trial Expiring" },
  { key: "monthly-renewal", label: "Monthly Renewal" },
  { key: "yearly-renewal", label: "Yearly Renewal" },
  { key: "paid-active", label: "Paid Active" },
  { key: "expired", label: "Expired" },
  { key: "stopped", label: "Stopped" },
  { key: "converted", label: "Converted Paid" },
];

function resolveFilter(raw: string | string[] | undefined): ReviewTrialsFilterKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return FILTERS.some((item) => item.key === value) ? (value as ReviewTrialsFilterKey) : "all";
}

function fmtText(value: string | null): string {
  return value && value.trim() ? value : "—";
}

function fmtDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "—";
}

const reviewPlanSelect = {
  id: true,
  businessName: true,
  phone: true,
  internationalPhone: true,
  reviewTrialStatus: true,
  reviewTrialStartAt: true,
  reviewTrialEndAt: true,
  reviewPlanType: true,
  reviewTrialCheckInSentAt: true,
  reviewRenewalReminderSentAt: true,
  reviewExpiredReminder1SentAt: true,
  reviewExpiredFollowUp1SentAt: true,
  reviewExpiredFollowUp2SentAt: true,
  reviewPublicUrl: true,
  reviewMerchantUrl: true,
  updatedAt: true,
} as const;

export default async function ReviewTrialsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const filter = resolveFilter((await searchParams).filter);
  const rows = await prisma.lead.findMany({
    where: reviewTrialsFilterWhere(filter),
    select: reviewPlanSelect,
    orderBy: [{ reviewTrialEndAt: "asc" }, { updatedAt: "desc" }],
  });
  const leads =
    filter === "all" || filter === "stopped" || filter === "converted"
      ? rows
      : rows.filter((lead) => matchesReviewTrialsFilter(lead, filter));

  return (
    <div className="page review-trials-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
        </Link>
      </p>
      <h1>Review Trials</h1>
      <p className="sub">Track trials, renewals, and follow-up reminders.</p>

      <div className="review-trial-filters">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={item.key === "all" ? "/review-trials" : `/review-trials?filter=${item.key}`}
            className={
              filter === item.key
                ? "queue-filter-pill queue-filter-pill-active"
                : "queue-filter-pill"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="table-wrap">
        <table className="queue review-trials-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Phone</th>
              <th>Plan Type</th>
              <th>Status</th>
              <th>Trial / Plan End</th>
              <th>Days Left</th>
              <th>Next Follow-up Reason</th>
              <th>Review Links</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const displayStatus = computeReviewPlanDisplayStatus(lead);
              const followUpReason = computeReviewFollowUpReason(lead);
              const planType = resolveReviewPlanType(lead) ?? "—";
              return (
                <tr key={lead.id}>
                  <td>{lead.businessName}</td>
                  <td>
                    {fmtText(lead.phone)}
                    {lead.internationalPhone ? (
                      <>
                        <br />
                        <span className="queue-muted">{lead.internationalPhone}</span>
                      </>
                    ) : null}
                  </td>
                  <td>{planType}</td>
                  <td>
                    <span className={reviewTrialStatusBadgeClass(displayStatus)}>
                      {displayStatus}
                    </span>
                  </td>
                  <td>{fmtDate(lead.reviewTrialEndAt)}</td>
                  <td>{formatReviewTrialDaysLeft(lead.reviewTrialEndAt)}</td>
                  <td className="review-follow-up-reason-cell">{followUpReason}</td>
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
                    <Link className="review-trial-action-link" href={`/leads/${lead.id}`}>
                      View Lead
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {leads.length === 0 ? <p className="empty">No review trials found.</p> : null}
    </div>
  );
}
