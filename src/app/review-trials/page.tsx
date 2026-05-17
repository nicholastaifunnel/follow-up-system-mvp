import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computeReviewTrialDisplayStatus,
  formatReviewTrialDaysLeft,
  reviewTrialStatusBadgeClass,
  reviewTrialsFilterWhere,
  type ReviewTrialsFilterKey,
} from "@/reviewTrialStatus";

export const dynamic = "force-dynamic";

const FILTERS: { key: ReviewTrialsFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring Soon" },
  { key: "expired", label: "Expired" },
  { key: "converted", label: "Converted Paid" },
  { key: "stopped", label: "Stopped" },
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

export default async function ReviewTrialsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const filter = resolveFilter((await searchParams).filter);
  const leads = await prisma.lead.findMany({
    where: reviewTrialsFilterWhere(filter),
    select: {
      id: true,
      businessName: true,
      phone: true,
      internationalPhone: true,
      reviewTrialStatus: true,
      reviewTrialStartAt: true,
      reviewTrialEndAt: true,
      reviewPublicUrl: true,
      reviewMerchantUrl: true,
      updatedAt: true,
    },
    orderBy: [{ reviewTrialEndAt: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="page review-trials-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
        </Link>
      </p>
      <h1>Review Trials</h1>
      <p className="sub">Track free trials and expiry follow-ups.</p>

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
              <th>Status</th>
              <th>Trial End</th>
              <th>Days Left</th>
              <th>Review Links</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const displayStatus = computeReviewTrialDisplayStatus(lead);
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
                  <td>
                    <span className={reviewTrialStatusBadgeClass(displayStatus)}>
                      {displayStatus}
                    </span>
                  </td>
                  <td>{fmtDate(lead.reviewTrialEndAt)}</td>
                  <td>{formatReviewTrialDaysLeft(lead.reviewTrialEndAt)}</td>
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
