import Link from "next/link";
import type { DailyActivityResult } from "@/getDailyActivity";
import { formatDateTimeMYT } from "@/formatMalaysiaTime";

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

function fmtText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

function PhoneCell({
  phone,
  internationalPhone,
  whatsappPhone,
}: {
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone: string | null;
}) {
  return (
    <>
      {whatsappPhone ? (
        <>
          <span className="phone-search-whatsapp">WhatsApp: {fmtText(whatsappPhone)}</span>
          <br />
        </>
      ) : null}
      {fmtText(phone)}
      {internationalPhone ? (
        <>
          <br />
          <span className="phone-search-intl">{fmtText(internationalPhone)}</span>
        </>
      ) : null}
    </>
  );
}

function ActivityLeadsTable({
  leads,
  timeLabel,
}: {
  leads: DailyActivityResult["sentLeads"];
  timeLabel: string;
}) {
  return (
    <div className="table-wrap queue-work-table-wrap">
      <table className="queue queue-work-table daily-activity-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Phone</th>
            <th>Message status</th>
            <th>Reply status</th>
            <th>{timeLabel}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td className="queue-td-clip">{fmtText(row.businessName)}</td>
              <td className="queue-td-phone">
                <PhoneCell
                  phone={row.phone}
                  internationalPhone={row.internationalPhone}
                  whatsappPhone={row.whatsappPhone}
                />
              </td>
              <td>{fmtText(row.messageStatus)}</td>
              <td>{fmtText(row.replyStatus)}</td>
              <td>{formatDateTimeMYT(row.activityAt)}</td>
              <td>
                <Link href={`/leads/${row.id}`}>View Lead</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DailyActivitySection({ activity, preserve }: Props) {
  const phoneTrim = preserve.phone.trim();
  const hiddenPreserve = {
    limit: preserve.limit,
    ...(phoneTrim ? { phone: phoneTrim } : {}),
    angle: preserve.angle,
    ...(preserve.reviewMax !== undefined ? { reviewMax: preserve.reviewMax } : {}),
  };

  return (
    <section className="section daily-activity-section">
      <div className="daily-activity-card">
        <h2 className="daily-activity-heading">Daily Activity</h2>
        <p className="sub daily-activity-note">
          Track sent messages and customer replies by date.
        </p>

        <form
          method="get"
          action="/queues"
          className="daily-activity-form"
          aria-label="Select activity date"
        >
          <input type="hidden" name="limit" value={preserve.limit} />
          <input type="hidden" name="angle" value={preserve.angle} />
          {phoneTrim ? <input type="hidden" name="phone" value={phoneTrim} /> : null}
          {preserve.reviewMax !== undefined ? (
            <input type="hidden" name="reviewMax" value={String(preserve.reviewMax)} />
          ) : null}
          <label className="daily-activity-date-label" htmlFor="activityDate">
            Date (MYT)
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
            <span className="daily-activity-stat-label">Customers Replied</span>
            <span className="daily-activity-stat-value">{activity.repliedCount}</span>
          </div>
          <div className="daily-activity-stat">
            <span className="daily-activity-stat-label">Reply Rate</span>
            <span className="daily-activity-stat-value">{activity.replyRate}</span>
          </div>
        </div>

        {activity.replyUsesUpdatedAtFallback ? (
          <p className="sub daily-activity-fallback-note">
            Reply count uses updatedAt as fallback when no reply timestamp exists.
          </p>
        ) : null}

        <div className="daily-activity-list-block">
          <h3 className="daily-activity-list-heading">Sent on selected date</h3>
          {activity.sentLeads.length === 0 ? (
            <p className="empty">No sent messages for this date.</p>
          ) : (
            <ActivityLeadsTable leads={activity.sentLeads} timeLabel="Sent at" />
          )}
        </div>

        <div className="daily-activity-list-block">
          <h3 className="daily-activity-list-heading">Replied on selected date</h3>
          {activity.repliedLeads.length === 0 ? (
            <p className="empty">No customer replies for this date.</p>
          ) : (
            <ActivityLeadsTable leads={activity.repliedLeads} timeLabel="Replied at" />
          )}
        </div>
      </div>
    </section>
  );
}
