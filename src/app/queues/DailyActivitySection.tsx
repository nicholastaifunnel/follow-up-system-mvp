import type { DailyActivityResult } from "@/getDailyActivity";
import { DailyActivityDetails } from "./DailyActivityDetails";

type PreserveParams = {
  limit: 10 | 20 | 50;
  phone: string;
  angle: string;
  reviewMax?: number;
  activityDate: string;
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
          Track leads by first message sent date. Replies are counted back to the
          original sent date.
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
          <label className="daily-activity-date-label" htmlFor="activityDate">
            Sent date (MYT)
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

        <div className="daily-activity-stats">
          <div className="daily-activity-stat">
            <span className="daily-activity-stat-label">Messages Sent</span>
            <span className="daily-activity-stat-value">{activity.sentCount}</span>
          </div>
          <div className="daily-activity-stat">
            <span className="daily-activity-stat-label">Replied From This Sent Group</span>
            <span className="daily-activity-stat-value">{activity.repliedCount}</span>
          </div>
          <div className="daily-activity-stat">
            <span className="daily-activity-stat-label">Reply Rate</span>
            <span className="daily-activity-stat-value">{activity.replyRate}</span>
          </div>
        </div>

        <p className="sub daily-activity-cohort-note">
          Replies are counted under the date the first message was sent, even if the
          customer replied later.
        </p>

        <DailyActivityDetails
          sentLeads={activity.sentLeads}
          repliedLeads={activity.repliedLeads}
        />
      </div>
    </section>
  );
}
