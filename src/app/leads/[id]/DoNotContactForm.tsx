"use client";

import { useState, useTransition } from "react";
import {
  DO_NOT_CONTACT_ACTIONS,
  doNotContactReasonLabel,
  type DoNotContactFields,
} from "@/doNotContact";
import { markDoNotContactAction } from "./actions";

type Props = {
  leadId: string;
  lead: DoNotContactFields;
};

export function DoNotContactForm({ leadId, lead }: Props) {
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reasonLabel = doNotContactReasonLabel(lead);

  function mark(reason: string) {
    const action = DO_NOT_CONTACT_ACTIONS.find((item) => item.key === reason);
    const confirmed = window.confirm(
      `Mark this lead as ${action?.label ?? "Do Not Contact"} and block future outreach?`,
    );
    if (!confirmed) return;

    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const result = await markDoNotContactAction({
        leadId,
        reason,
        note,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setNote("");
      setFeedback("Lead marked as Do Not Contact.");
    });
  }

  return (
    <div className="dnc-form">
      {reasonLabel ? (
        <div className="dnc-warning" role="status">
          Do Not Contact — this lead is blocked from outreach.
          <br />
          Reason: {reasonLabel}
        </div>
      ) : null}

      <label className="reply-form-label dnc-note-label">
        Stop note
        <textarea
          className="reply-form-textarea dnc-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional: why this lead should not receive more outreach."
          rows={3}
        />
      </label>

      <div className="dnc-actions">
        {DO_NOT_CONTACT_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            className="review-trial-danger-btn dnc-action-btn"
            disabled={isPending}
            onClick={() => mark(action.key)}
          >
            Mark {action.label}
          </button>
        ))}
      </div>

      {feedback ? <p className="reply-form-saved">{feedback}</p> : null}
      {error ? <p className="reply-form-error">{error}</p> : null}
    </div>
  );
}
