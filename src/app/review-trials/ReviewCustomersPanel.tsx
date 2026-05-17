"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReviewTrialsFilterKey } from "@/reviewPlanFollowUp";
import { ReviewTrialsTable, type ReviewTrialsTableLead } from "./ReviewTrialsTable";

export type ReviewFilterChip = {
  key: ReviewTrialsFilterKey;
  label: string;
  href: string;
};

type RowLimit = 30 | 50 | 100 | "all";

const ROW_OPTIONS: { value: RowLimit; label: string }[] = [
  { value: 30, label: "30" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: "all", label: "All" },
];

type Props = {
  filterKey: ReviewTrialsFilterKey;
  filterLabel: string;
  filterChips: ReviewFilterChip[];
  leads: ReviewTrialsTableLead[];
};

function buildStatusText(
  shown: number,
  total: number,
  rowLimit: RowLimit,
  filterLabel: string,
): string {
  if (total === 0) {
    return `Showing 0 leads · filter: ${filterLabel}`;
  }
  if (rowLimit === "all" || shown >= total) {
    return `Showing all ${total} lead${total === 1 ? "" : "s"} · filter: ${filterLabel}`;
  }
  return `Showing ${shown} of ${total} leads · filter: ${filterLabel}`;
}

export function ReviewCustomersPanel({
  filterKey,
  filterLabel,
  filterChips,
  leads,
}: Props) {
  const [rowLimit, setRowLimit] = useState<RowLimit>(30);
  const [expanded, setExpanded] = useState(true);

  const total = leads.length;
  const displayedLeads =
    rowLimit === "all" ? leads : leads.slice(0, rowLimit);
  const shown = displayedLeads.length;
  const statusText = buildStatusText(shown, total, rowLimit, filterLabel);

  return (
    <section className="review-follow-up-main">
      <div className="review-customers-toolbar">
        <h2 className="review-follow-up-main-heading">Review customers</h2>
        <div className="review-customers-toolbar-actions">
          <div className="review-customers-row-limit" role="group" aria-label="Rows to show">
            <span className="review-customers-row-limit-label">Rows</span>
            <div className="review-customers-row-limit-options">
              {ROW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    rowLimit === option.value
                      ? "review-row-limit-btn review-row-limit-btn--active"
                      : "review-row-limit-btn"
                  }
                  aria-pressed={rowLimit === option.value}
                  onClick={() => setRowLimit(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="review-customers-collapse-btn"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Collapse list" : "Expand list"}
          </button>
        </div>
      </div>

      <div className="review-trial-filters">
        {filterChips.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={
              filterKey === item.key
                ? "queue-filter-pill queue-filter-pill-active"
                : "queue-filter-pill"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      <p className="review-follow-up-main-meta">{statusText}</p>

      {expanded ? (
        <ReviewTrialsTable
          leads={displayedLeads}
          emptyMessage={`No leads match filter: ${filterLabel}.`}
        />
      ) : null}
    </section>
  );
}
