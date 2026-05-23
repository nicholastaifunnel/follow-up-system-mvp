import type { BatchSafetySummary } from "@/getBatchSafetySummary";

type Props = {
  summary: BatchSafetySummary;
};

export function BatchSafetySection({ summary }: Props) {
  return (
    <section className="section batch-safety-section">
      <div className="batch-safety-card">
        <h2 className="batch-safety-heading">Batch Safety</h2>
        <p className="sub batch-safety-note">
          Manual sending only. Process one small batch, then pause before the next
          batch.
        </p>
        <div
          className="batch-safety-overview-grid"
          role="group"
          aria-label="Batch safety summary"
        >
          <article className="batch-safety-overview-card batch-safety-overview-card--sent">
            <span className="batch-safety-overview-label">Sent today</span>
            <span className="batch-safety-overview-count">{summary.sentToday}</span>
          </article>
          <article className="batch-safety-overview-card batch-safety-overview-card--batch">
            <span className="batch-safety-overview-label">Suggested batch</span>
            <span className="batch-safety-overview-count">{summary.suggestedBatch}</span>
          </article>
          <article className="batch-safety-overview-card batch-safety-overview-card--next">
            <span className="batch-safety-overview-label">Next batch</span>
            <span className="batch-safety-overview-hint">{summary.nextBatchHint}</span>
          </article>
        </div>
      </div>
    </section>
  );
}
