"use client";

import Link from "next/link";
import { useState } from "react";
import type { DailyActivityLeadRow } from "@/getDailyActivity";
import { formatDateTimeMYT } from "@/formatMalaysiaTime";

type Props = {
  sentLeads: DailyActivityLeadRow[];
  repliedLeads: DailyActivityLeadRow[];
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
  leads: DailyActivityLeadRow[];
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

export function DailyActivityDetails({ sentLeads, repliedLeads }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="daily-activity-details">
      <button
        type="button"
        className="daily-activity-details-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Hide details" : "Show details"}
      </button>

      {open ? (
        <div className="daily-activity-details-panel">
          <div className="daily-activity-list-block">
            <h3 className="daily-activity-list-heading">Sent on selected date</h3>
            {sentLeads.length === 0 ? (
              <p className="empty">No sent messages for this date.</p>
            ) : (
              <ActivityLeadsTable leads={sentLeads} timeLabel="Sent at" />
            )}
          </div>

          <div className="daily-activity-list-block">
            <h3 className="daily-activity-list-heading">Replied from this sent group</h3>
            {repliedLeads.length === 0 ? (
              <p className="empty">No replies from this sent group yet.</p>
            ) : (
              <ActivityLeadsTable leads={repliedLeads} timeLabel="Replied at" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
