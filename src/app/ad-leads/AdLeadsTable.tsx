"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { AdLeadRow } from "@/getAdLeadsInbox";
import { formatDateTimeMYT } from "@/formatMalaysiaTime";
import {
  approveAdLeadAction,
  needMoreInfoAdLeadAction,
  rejectAdLeadAction,
  saveAdLeadNotesAction,
} from "./actions";

function fmt(v: string | null | undefined): string {
  return v && v.trim() ? v : "—";
}

type Props = {
  leads: AdLeadRow[];
  showActions?: boolean;
};

export function AdLeadsTable({ leads, showActions = true }: Props) {
  const [pending, startTransition] = useTransition();

  if (leads.length === 0) {
    return <p className="empty">No leads in this section.</p>;
  }

  return (
    <div className="table-wrap ad-leads-table-wrap">
      <table className="queue ad-leads-table">
        <thead>
          <tr>
            <th>Requested</th>
            <th>Business</th>
            <th>Contact</th>
            <th>WhatsApp</th>
            <th>Google Maps name / URL</th>
            <th>Facebook page</th>
            <th>Campaign</th>
            <th>LP ver.</th>
            <th>Apply link</th>
            <th>Channel</th>
            <th>Status</th>
            <th></th>
            {showActions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td>{formatDateTimeMYT(row.trialRequestedAt)}</td>
              <td className="queue-td-clip">{row.businessName}</td>
              <td>{fmt(row.contactPerson)}</td>
              <td className="queue-td-phone">{fmt(row.whatsappPhone)}</td>
              <td className="queue-td-clip">{fmt(row.googleMapName)}</td>
              <td className="queue-td-clip">{fmt(row.facebookPage)}</td>
              <td className="queue-td-clip">
                {fmt(row.adCampaignName)}
                {row.adCampaignId ? (
                  <>
                    <br />
                    <span className="queue-muted">{row.adCampaignId}</span>
                  </>
                ) : null}
              </td>
              <td>{fmt(row.landingPageVersion)}</td>
              <td className="queue-td-clip">{fmt(row.applyLinkName)}</td>
              <td>{fmt(row.inboundSourceChannel)}</td>
              <td>{fmt(row.adLeadStatus)}</td>
              <td>
                <Link href={`/leads/${row.id}`}>View Lead</Link>
              </td>
              {showActions ? (
                <td className="ad-leads-actions-cell">
                  <div className="ad-leads-actions">
                    <button
                      type="button"
                      className="queue-limit-pill"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const r = await approveAdLeadAction(row.id);
                          if (!r.ok) alert(r.error);
                        });
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="queue-limit-pill"
                      disabled={pending}
                      onClick={() => {
                        const note = window.prompt("Notes for Need More Info (optional):");
                        if (note === null) return;
                        startTransition(async () => {
                          const r = await needMoreInfoAdLeadAction(row.id, note);
                          if (!r.ok) alert(r.error);
                        });
                      }}
                    >
                      Need info
                    </button>
                    <button
                      type="button"
                      className="queue-limit-pill"
                      disabled={pending}
                      onClick={() => {
                        const note = window.prompt("Rejection note (optional):");
                        if (note === null) return;
                        startTransition(async () => {
                          const r = await rejectAdLeadAction(row.id, note);
                          if (!r.ok) alert(r.error);
                        });
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="queue-limit-pill"
                      disabled={pending}
                      onClick={() => {
                        const note = window.prompt("Save notes:", row.manualNotes ?? "");
                        if (note === null) return;
                        startTransition(async () => {
                          const r = await saveAdLeadNotesAction(row.id, note);
                          if (!r.ok) alert(r.error);
                        });
                      }}
                    >
                      Notes
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
