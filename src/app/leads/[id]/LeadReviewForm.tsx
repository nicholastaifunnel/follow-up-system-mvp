"use client";

import { useState, useTransition } from "react";
import {
  LEAD_REVIEW_APPROVED,
  LEAD_REVIEW_NEED_MORE_INFO,
  LEAD_REVIEW_NEEDS_REVIEW,
  LEAD_REVIEW_REJECTED,
  leadReviewStatusLabel,
  type LeadReviewStatus,
} from "@/leadReviewStatus";
import { updateLeadReviewAction } from "./actions";

const CHECKLIST = [
  "Google profile looks active",
  "Review count / rating looks suitable",
  "Facebook / website checked if needed",
  "Not competitor / agency",
  "Contact number looks usable",
  "Business type fits Review QR offer",
] as const;

type Props = {
  leadId: string;
  currentStatus: string | null;
  initialNotes: string | null;
};

type SaveState =
  | { kind: "idle"; message: string | null }
  | { kind: "saved"; message: string }
  | { kind: "error"; message: string };

export function LeadReviewForm({
  leadId,
  currentStatus,
  initialNotes,
}: Props) {
  const normalizedStatus =
    currentStatus && currentStatus.trim()
      ? currentStatus.trim()
      : LEAD_REVIEW_NEEDS_REVIEW;
  const [status, setStatus] = useState<string>(normalizedStatus);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saveState, setSaveState] = useState<SaveState>({
    kind: "idle",
    message: null,
  });
  const [isPending, startTransition] = useTransition();

  function save(nextStatus?: LeadReviewStatus) {
    const reviewStatus = nextStatus ?? status;
    setSaveState({ kind: "idle", message: null });
    startTransition(async () => {
      const result = await updateLeadReviewAction({
        leadId,
        reviewStatus,
        reviewNotes: notes,
      });

      if (!result.ok) {
        setSaveState({ kind: "error", message: result.error });
        return;
      }

      setStatus(result.outreachReadiness);
      setNotes(result.manualNotes ?? "");
      setSaveState({ kind: "saved", message: "Lead review saved." });
    });
  }

  function choose(nextStatus: LeadReviewStatus) {
    setStatus(nextStatus);
    save(nextStatus);
  }

  return (
    <div className="lead-review-form">
      <div className="lead-review-status-line">
        <span className="lead-review-status-label">Current review status</span>
        <span className={`lead-review-status-pill lead-review-status-pill--${statusClass(status)}`}>
          {leadReviewStatusLabel(status)}
        </span>
      </div>

      <div className="lead-review-actions">
        <button
          type="button"
          className="review-trial-secondary-btn lead-review-action-btn lead-review-action-btn--approve"
          disabled={isPending}
          onClick={() => choose(LEAD_REVIEW_APPROVED)}
        >
          Approve lead
        </button>
        <button
          type="button"
          className="review-trial-secondary-btn lead-review-action-btn"
          disabled={isPending}
          onClick={() => choose(LEAD_REVIEW_NEED_MORE_INFO)}
        >
          Need more info
        </button>
        <button
          type="button"
          className="review-trial-danger-btn lead-review-action-btn"
          disabled={isPending}
          onClick={() => choose(LEAD_REVIEW_REJECTED)}
        >
          Reject lead
        </button>
      </div>

      <div className="lead-review-checklist">
        {CHECKLIST.map((item) => (
          <span key={item}>- {item}</span>
        ))}
      </div>

      <label className="reply-form-label lead-review-notes-label">
        Review notes
        <textarea
          className="reply-form-textarea lead-review-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional: why this lead was approved, needs more info, or rejected."
          rows={3}
        />
      </label>

      <div className="lead-review-save-row">
        <button
          type="button"
          className="reply-form-submit lead-review-save-btn"
          disabled={isPending}
          onClick={() => save()}
        >
          {isPending ? "Saving..." : "Save notes"}
        </button>
        {saveState.message ? (
          <span
            className={
              saveState.kind === "error"
                ? "reply-form-error"
                : "reply-form-saved"
            }
          >
            {saveState.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function statusClass(status: string): string {
  if (status === LEAD_REVIEW_APPROVED) return "approved";
  if (status === LEAD_REVIEW_NEED_MORE_INFO) return "more-info";
  if (status === LEAD_REVIEW_REJECTED) return "rejected";
  return "needs-review";
}
