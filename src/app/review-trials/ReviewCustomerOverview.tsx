import type { ReviewCustomerOverviewCounts } from "@/reviewPlanFollowUp";

type OverviewCard = {
  key: keyof ReviewCustomerOverviewCounts;
  label: string;
  tone: "positive" | "expired" | "stopped" | "converted" | "follow-up";
};

const OVERVIEW_CARDS: OverviewCard[] = [
  { key: "freeTrialActive", label: "Free Trial Active", tone: "positive" },
  { key: "freeTrialExpired", label: "Free Trial Expired", tone: "expired" },
  { key: "monthlyPaidActive", label: "Monthly Paid Active", tone: "positive" },
  { key: "yearlyPaidActive", label: "Yearly Paid Active", tone: "positive" },
  { key: "stopped", label: "Stopped", tone: "stopped" },
  { key: "convertedPaid", label: "Converted Paid", tone: "converted" },
  { key: "needFollowUp", label: "Need Follow-up", tone: "follow-up" },
];

type Props = {
  counts: ReviewCustomerOverviewCounts;
};

export function ReviewCustomerOverview({ counts }: Props) {
  return (
    <section className="review-customer-overview" aria-label="Review customer overview">
      <h2 className="review-customer-overview-heading">Review customer overview</h2>
      <div className="review-customer-overview-grid">
        {OVERVIEW_CARDS.map((card) => (
          <article
            key={card.key}
            className={`review-customer-overview-card review-customer-overview-card--${card.tone}`}
          >
            <span className="review-customer-overview-label">{card.label}</span>
            <span className="review-customer-overview-count">{counts[card.key]}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
