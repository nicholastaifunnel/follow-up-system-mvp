import { formatDateOnlyMYT, formatDateTimeMYT } from "@/formatMalaysiaTime";
import { formatRmFromCents } from "@/money";
import {
  formatPlanPeriodDuration,
  resolvePeriodPriceCents,
  summarizePlanUsage,
  type ReviewPlanUsagePeriod,
} from "@/reviewPlanUsage";

type Props = {
  periods: ReviewPlanUsagePeriod[];
};

export function PlanUsageHistory({ periods }: Props) {
  const summary = summarizePlanUsage(periods);

  if (summary.sorted.length === 0) {
    return (
      <p className="plan-usage-history-empty">
        No plan history yet. Start a plan to create the first period.
      </p>
    );
  }

  return (
    <div className="plan-usage-history">
      <dl className="plan-usage-history-summary">
        <div>
          <dt>Total periods</dt>
          <dd>{summary.totalPeriods}</dd>
        </div>
        <div>
          <dt>Total paid</dt>
          <dd>{summary.totalPaidLabel}</dd>
        </div>
        <div>
          <dt>Current active period</dt>
          <dd>{summary.activeLabel}</dd>
        </div>
        <div>
          <dt>Total usage days</dt>
          <dd>{summary.totalUsageDaysLabel}</dd>
        </div>
      </dl>

      <div className="table-wrap plan-usage-history-table-wrap">
        <table className="queue plan-usage-history-table">
          <thead>
            <tr>
              <th>Plan Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Status</th>
              <th>Source</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {summary.sorted.map((period) => {
              const priceCents = resolvePeriodPriceCents(period);
              return (
                <tr key={period.id}>
                  <td>{period.planType}</td>
                  <td>{formatDateOnlyMYT(period.startAt)}</td>
                  <td>{period.endAt ? formatDateOnlyMYT(period.endAt) : "—"}</td>
                  <td>
                    {formatPlanPeriodDuration(period.startAt, period.endAt, period.planType)}
                  </td>
                  <td>{formatRmFromCents(priceCents, period.currency)}</td>
                  <td>{period.status}</td>
                  <td>{period.source ?? "—"}</td>
                  <td>{formatDateTimeMYT(period.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
