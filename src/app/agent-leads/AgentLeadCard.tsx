"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AgentLeadRow } from "@/getAgentLead";
import { digitsForWaMe } from "@/lib/digitsForWaMe";
import { MarkAsSentButton } from "@/app/leads/[id]/MarkAsSentButton";
import { skipLeadForDetailAction } from "@/app/leads/[id]/actions";
import { needManualForAgentAction } from "./actions";

type Props = {
  lead: AgentLeadRow;
};

function displayPhone(lead: AgentLeadRow): string {
  return (
    lead.whatsappPhone?.trim() ||
    lead.internationalPhone?.trim() ||
    lead.phone?.trim() ||
    "—"
  );
}

export function AgentLeadCard({ lead }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [exitError, setExitError] = useState<string | null>(null);
  const prepared = (lead.preparedMessage ?? "").trim();
  const digits = digitsForWaMe(
    lead.phone,
    lead.internationalPhone,
    lead.whatsappPhone,
  );

  function onExitAction(
    action: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setExitError(null);
    startTransition(() => {
      void action().then((result) => {
        if (result.ok) {
          router.refresh();
        } else {
          setExitError(result.error ?? "Action failed.");
        }
      });
    });
  }

  return (
    <article className="ad-apply-link-card agent-lead-card">
      <div className="ad-apply-link-card-head">
        <h2 className="ad-apply-link-name">{lead.businessName}</h2>
      </div>

      <div className="ad-apply-section">
        <div className="ad-apply-detail-grid">
          <div className="ad-apply-detail-row">
            <span className="ad-apply-detail-label">WhatsApp / phone</span>
            <span className="ad-apply-detail-value">{displayPhone(lead)}</span>
          </div>
        </div>
      </div>

      <div className="ad-apply-section ad-apply-form-link-section">
        <h3 className="ad-apply-section-title">Prepared Message</h3>
        <pre className="ad-apply-full-form-link agent-lead-prepared-message">
          {lead.preparedMessage}
        </pre>
      </div>

      <div className="ad-apply-form-link-actions agent-lead-actions">
        {!prepared ? (
          <span className="open-whatsapp-hint">Prepare a draft first.</span>
        ) : !digits ? (
          <span className="open-whatsapp-hint">
            No usable phone for WhatsApp.
          </span>
        ) : (
          <a
            href={`https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(prepared)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="open-whatsapp-btn open-whatsapp-btn-primary"
          >
            Open WhatsApp Web
          </a>
        )}
        <MarkAsSentButton
          leadId={lead.id}
          canMarkSent
          reason=""
        />
        <button
          type="button"
          className="queue-limit-pill"
          disabled={isPending}
          onClick={() =>
            onExitAction(() => needManualForAgentAction(lead.id))
          }
        >
          Need Manual
        </button>
        <button
          type="button"
          className="queue-limit-pill"
          disabled={isPending}
          onClick={() =>
            onExitAction(() =>
              skipLeadForDetailAction({ leadId: lead.id, reason: "other" }),
            )
          }
        >
          Skip
        </button>
      </div>

      {exitError ? <p className="mark-sent-error">{exitError}</p> : null}
    </article>
  );
}
