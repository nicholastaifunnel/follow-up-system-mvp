import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  bucketReviewDailyWorkLeads,
  matchesReviewTrialsFilter,
  REVIEW_DAILY_WORK_LABELS,
  reviewTrialsFilterWhere,
  sortReviewLeadsByRecentActivity,
  type ReviewDailyWorkBucket,
  type ReviewTrialsFilterKey,
} from "@/reviewPlanFollowUp";
import { QueueSection } from "@/app/queues/QueueSection";
import { ReviewCustomersPanel, type ReviewFilterChip } from "./ReviewCustomersPanel";
import { ReviewTrialsTable, type ReviewTrialsTableLead } from "./ReviewTrialsTable";

export const dynamic = "force-dynamic";

const FILTER_CHIPS: { key: ReviewTrialsFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "need-follow-up", label: "Need Follow-up" },
  { key: "trial-check-in", label: "Trial Check-in" },
  { key: "trial-expiring", label: "Trial Expiring" },
  { key: "monthly-renewal", label: "Monthly Renewal" },
  { key: "yearly-renewal", label: "Yearly Renewal" },
  { key: "expired-follow-up", label: "Expired Follow-up" },
  { key: "paid-active", label: "Paid Active" },
  { key: "stopped", label: "Stopped" },
  { key: "converted", label: "Converted Paid" },
];

const DAILY_WORK_SECTIONS: {
  key: ReviewDailyWorkBucket;
  defaultExpanded: boolean;
}[] = [
  { key: "overdue", defaultExpanded: true },
  { key: "due-today", defaultExpanded: true },
  { key: "upcoming-soon", defaultExpanded: false },
  { key: "no-action-needed", defaultExpanded: false },
];

function resolveFilter(raw: string | string[] | undefined): ReviewTrialsFilterKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return FILTER_CHIPS.some((item) => item.key === value)
    ? (value as ReviewTrialsFilterKey)
    : "all";
}

function filterHref(key: ReviewTrialsFilterKey): string {
  if (key === "all") return "/review-trials";
  return `/review-trials?filter=${key}`;
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
  reviewPlanAmountCents: true,
  reviewPlanCurrency: true,
  reviewTrialUpdatedAt: true,
  reviewTrialCheckInSentAt: true,
  reviewRenewalReminderSentAt: true,
  reviewExpiredReminder1SentAt: true,
  reviewExpiredFollowUp1SentAt: true,
  reviewExpiredFollowUp2SentAt: true,
  reviewPublicUrl: true,
  reviewMerchantUrl: true,
  updatedAt: true,
  createdAt: true,
} as const;

export default async function ReviewTrialsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const filter = resolveFilter((await searchParams).filter);
  const rows = await prisma.lead.findMany({
    where: reviewTrialsFilterWhere("all"),
    select: reviewPlanSelect,
    orderBy: [{ reviewTrialEndAt: "asc" }, { updatedAt: "desc" }],
  });

  const filteredLeads: ReviewTrialsTableLead[] =
    filter === "all" || filter === "stopped" || filter === "converted"
      ? filter === "all"
        ? rows
        : rows.filter((lead) => matchesReviewTrialsFilter(lead, filter))
      : rows.filter((lead) => matchesReviewTrialsFilter(lead, filter));

  const mainListLeads = sortReviewLeadsByRecentActivity(filteredLeads);
  const dailyBuckets = bucketReviewDailyWorkLeads(rows);

  const filterChips: ReviewFilterChip[] = FILTER_CHIPS.map((item) => ({
    key: item.key,
    label: item.label,
    href: filterHref(item.key),
  }));

  const filterLabel =
    FILTER_CHIPS.find((item) => item.key === filter)?.label ?? filter;

  return (
    <div className="page review-trials-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
        </Link>
      </p>
      <h1>Review Follow-up</h1>
      <p className="sub">Workbench for trials, renewals, and expired follow-ups.</p>

      <ReviewCustomersPanel
        filterKey={filter}
        filterLabel={filterLabel}
        filterChips={filterChips}
        leads={mainListLeads}
      />

      <section className="review-follow-up-daily">
        <h2 className="review-follow-up-main-heading">Daily work</h2>
        <p className="review-follow-up-daily-hint">
          Each customer appears in one section only, sorted by follow-up due date (Malaysia
          time).
        </p>
        <div className="review-follow-up-sections">
          {DAILY_WORK_SECTIONS.map((section) => {
            const leads = dailyBuckets[section.key];
            return (
              <QueueSection
                key={section.key}
                title={REVIEW_DAILY_WORK_LABELS[section.key]}
                totalCount={leads.length}
                shownCount={leads.length}
                defaultExpanded={section.defaultExpanded}
              >
                <ReviewTrialsTable leads={leads} emptyMessage="No leads in this group." />
              </QueueSection>
            );
          })}
        </div>
      </section>
    </div>
  );
}
