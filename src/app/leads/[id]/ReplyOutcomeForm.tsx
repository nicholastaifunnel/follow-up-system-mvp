"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordReplyOutcomeAction } from "./actions";

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "no-reply", label: "No reply" },
  { value: "asked-price", label: "Asked price" },
  { value: "interested", label: "Interested" },
  { value: "follow-up-later", label: "Follow up later" },
  { value: "not-interested", label: "Not interested" },
  { value: "wrong-contact", label: "Wrong contact" },
  { value: "need-more-info", label: "Need more info" },
];

type Props = {
  leadId: string;
  canRecordReply: boolean;
  reason: string;
};

export function ReplyOutcomeForm({ leadId, canRecordReply, reason }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<string>("no-reply");
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!canRecordReply) {
    return <p className="reply-outcome-blocked">{reason}</p>;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(() => {
      void recordReplyOutcomeAction({
        leadId,
        outcome,
        replyNotes: notes.trim() === "" ? null : notes,
        nextFollowUpAtISO:
          outcome === "follow-up-later" && followUpAt.trim() !== ""
            ? followUpAt
            : null,
      }).then((result) => {
        if (result.ok) {
          setSaved(true);
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <form className="reply-outcome-form" onSubmit={onSubmit}>
      <div className="reply-form-row">
        <label className="reply-form-label" htmlFor={`outcome-${leadId}`}>
          Outcome
        </label>
        <select
          id={`outcome-${leadId}`}
          className="reply-form-select"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          disabled={isPending}
        >
          {OUTCOME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {outcome === "follow-up-later" ? (
        <div className="reply-form-row">
          <label className="reply-form-label" htmlFor={`followup-${leadId}`}>
            Next follow-up (optional)
          </label>
          <input
            id={`followup-${leadId}`}
            type="datetime-local"
            className="reply-form-input"
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
            disabled={isPending}
          />
        </div>
      ) : null}

      <div className="reply-form-row">
        <label className="reply-form-label" htmlFor={`notes-${leadId}`}>
          Notes
        </label>
        <textarea
          id={`notes-${leadId}`}
          className="reply-form-textarea"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          placeholder="Optional notes about the reply…"
        />
      </div>

      <div className="reply-form-actions">
        <button type="submit" className="reply-form-submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save outcome"}
        </button>
      </div>

      {error ? <p className="reply-form-error">{error}</p> : null}
      {saved ? <p className="reply-form-saved">Saved</p> : null}
    </form>
  );
}
