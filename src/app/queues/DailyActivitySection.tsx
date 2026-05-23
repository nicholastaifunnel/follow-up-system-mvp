import type { DailyActivityResult } from "@/getDailyActivity";
import { DailyActivityDetails } from "./DailyActivityDetails";

import type { FirstOutreachBatchSize } from "@/batchQueueParams";
import { DEFAULT_FIRST_OUTREACH_BATCH } from "@/batchQueueParams";

type PreserveParams = {
  limit: 10 | 20 | 50;
  phone: string;
  angle: string;
  reviewMax?: number;
  activityDate: string;
  batch: FirstOutreachBatchSize;
};

type Props = {
  activity: DailyActivityResult;
  preserve: PreserveParams;
};

export function DailyActivitySection({ activity, preserve }: Props) {
  const phoneTrim = preserve.phone.trim();

  return (
    <section className="section daily-activity-section">
      <div className="daily-activity-card">
        <h2 className="daily-activity-heading">Daily Activity</h2>
        <p className="sub daily-activity-note">
          Track leads by first message sent date.
        </p>

        <form
          method="get"
          action="/queues"
          className="daily-activity-form"
          aria-label="Select first message sent date"
        >
          <input type="hidden" name="limit" value={preserve.limit} />
          <input type="hidden" name="angle" value={preserve.angle} />
          {phoneTrim ? <input type="hidden" name="phone" value={phoneTrim} /> : null}
          {preserve.reviewMax !== undefined ? (
            <input type="hidden" name="reviewMax" value={String(preserve.reviewMax)} />
          ) : null}
          {preserve.batch !== DEFAULT_FIRST_OUTREACH_BATCH ? (
            <input type="hidden" name="batch" value={String(preserve.batch)} />
          ) : null}
          <label className="daily-activity-date-label" htmlFor="activityDate">
            Date
          </label>
          <input
            id="activityDate"
            type="date"
            name="activityDate"
            className="daily-activity-date-input"
            defaultValue={activity.activityDate}
          />
          <button type="submit" className="phone-search-btn">
            View
          </button>
        </form>

        <div
          className="daily-activity-overview-grid"
          role="group"
          aria-label="Daily activity summary"
        >
          <article className="daily-activity-overview-card daily-activity-overview-card--sent">
            <span className="daily-activity-overview-label">Sent</span>
            <span className="daily-activity-overview-count">{activity.sentCount}</span>
          </article>
          <article className="daily-activity-overview-card daily-activity-overview-card--replies">
            <span className="daily-activity-overview-label">Replies</span>
            <span className="daily-activity-overview-count">{activity.repliedCount}</span>
          </article>
          <article className="daily-activity-overview-card daily-activity-overview-card--rate">
            <span className="daily-activity-overview-label">Rate</span>
            <span className="daily-activity-overview-count">{activity.replyRate}</span>
          </article>
        </div>

        <p className="sub daily-activity-cohort-note">
          Replies are counted under the original sent date.
        </p>

        <DailyActivityDetails
          sentLeads={activity.sentLeads}
          repliedLeads={activity.repliedLeads}
        />
      </div>
    </section>
  );
}
