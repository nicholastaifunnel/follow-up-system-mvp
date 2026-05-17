import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type FilterKey = "all" | "active" | "expiring" | "expired" | "converted" | "stopped";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring Soon" },
  { key: "expired", label: "Expired" },
  { key: "converted", label: "Converted Paid" },
  { key: "stopped", label: "Stopped" },
];

function resolveFilter(raw: string | string[] | undefined): FilterKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return FILTERS.some((item) => item.key === value) ? (value as FilterKey) : "all";
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function endOfNextSevenDays(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d;
}

function filterWhere(filter: FilterKey): Prisma.LeadWhereInput {
  const today = startOfToday();
  const soon = endOfNextSevenDays();
  switch (filter) {
    case "active":
      return { reviewTrialStatus: "Trial Active" };
    case "expiring":
      return {
        OR: [
          { reviewTrialStatus: "Trial Expiring Soon" },
          {
            reviewTrialStatus: "Trial Active",
            reviewTrialEndAt: { gte: today, lte: soon },
          },
        ],
      };
    case "expired":
      return { reviewTrialStatus: "Trial Expired" };
    case "converted":
      return { reviewTrialStatus: "Converted Paid" };
    case "stopped":
      return { reviewTrialStatus: "Stopped" };
    case "all":
    default:
      return { reviewTrialStatus: { not: null } };
  }
}

function fmtText(value: string | null): string {
  return value && value.trim() ? value : "—";
}

function fmtDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "—";
}

function daysLeft(value: Date | null): string {
  if (!value) return "—";
  const today = startOfToday();
  const end = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
  const diff = Math.round((end.getTime() - today.getTime()) / 86_400_000);
  if (diff > 0) return `${diff} day${diff === 1 ? "" : "s"} left`;
  if (diff === 0) return "Ends today";
  const expired = Math.abs(diff);
  return `Expired ${expired} day${expired === 1 ? "" : "s"} ago`;
}

function statusClass(status: string | null): string {
  switch (status) {
    case "Trial Active":
      return "review-trial-badge review-trial-badge--active";
    case "Trial Expiring Soon":
      return "review-trial-badge review-trial-badge--expiring";
    case "Trial Expired":
      return "review-trial-badge review-trial-badge--expired";
    case "Converted Paid":
      return "review-trial-badge review-trial-badge--converted";
    case "Stopped":
      return "review-trial-badge review-trial-badge--stopped";
    default:
      return "review-trial-badge";
  }
}

export default async function ReviewTrialsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const filter = resolveFilter((await searchParams).filter);
  const leads = await prisma.lead.findMany({
    where: filterWhere(filter),
    select: {
      id: true,
      businessName: true,
      phone: true,
      internationalPhone: true,
      reviewTrialStatus: true,
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
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
                  <span className={statusClass(lead.reviewTrialStatus)}>
                    {fmtText(lead.reviewTrialStatus)}
                  </span>
                </td>
                <td>{fmtDate(lead.reviewTrialEndAt)}</td>
                <td>{daysLeft(lead.reviewTrialEndAt)}</td>
                <td className="review-trial-links-cell">
                  {lead.reviewPublicUrl ? (
                    <a href={lead.reviewPublicUrl} target="_blank" rel="noopener noreferrer">
                      Public
                    </a>
                  ) : null}
                  {lead.reviewMerchantUrl ? (
                    <a href={lead.reviewMerchantUrl} target="_blank" rel="noopener noreferrer">
                      Admin
                    </a>
                  ) : null}
                  {!lead.reviewPublicUrl && !lead.reviewMerchantUrl ? "—" : null}
                </td>
                <td>
                  <Link href={`/leads/${lead.id}`}>View Lead</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {leads.length === 0 ? <p className="empty">No review trials found.</p> : null}
    </div>
  );
}
