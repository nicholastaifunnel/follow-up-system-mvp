"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markReviewExpiredFollowUp1SentAction,
  markReviewExpiredFollowUp2SentAction,
  markReviewExpiredReminder1SentAction,
  markReviewRenewalReminderSentAction,
  markReviewTrialCheckInSentAction,
} from "./actions";

type Props = {
  leadId: string;
  checkInSentAt: string | null;
  renewalReminderSentAt: string | null;
  expiredReminder1SentAt: string | null;
  expiredFollowUp1SentAt: string | null;
  expiredFollowUp2SentAt: string | null;
};

function fmtSentAt(value: string | null): string {
  if (!value) return "Not sent";
  return value.slice(0, 10);
}

export function ReviewFollowUpTracking({
  leadId,
  checkInSentAt,
  renewalReminderSentAt,
  expiredReminder1SentAt,
  expiredFollowUp1SentAt,
  expiredFollowUp2SentAt,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function mark(
    label: string,
    action: (id: string) => Promise<{ ok: boolean; error?: string }>,
  ) {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void action(leadId).then((result) => {
        if (result.ok) {
          setFeedback(`${label} recorded`);
          router.refresh();
        } else {
          setError(result.error ?? "Could not save.");
        }
      });
    });
  }

  return (
    <div className="review-follow-up-tracking">
      <h3 className="review-follow-up-heading">Follow-up tracking</h3>
      <p className="review-trial-status-hint">
        Mark when you have sent each follow-up manually. This only records timestamps.
      </p>
      <ul className="review-follow-up-sent-list">
        <li>Trial check-in: {fmtSentAt(checkInSentAt)}</li>
        <li>Renewal reminder: {fmtSentAt(renewalReminderSentAt)}</li>
        <li>Expired reminder 1: {fmtSentAt(expiredReminder1SentAt)}</li>
        <li>Expired follow-up 1: {fmtSentAt(expiredFollowUp1SentAt)}</li>
        <li>Expired follow-up 2: {fmtSentAt(expiredFollowUp2SentAt)}</li>
      </ul>
      <div className="review-follow-up-actions">
        <button
          type="button"
          className="review-trial-secondary-btn"
          disabled={isPending}
          onClick={() => mark("Trial check-in", markReviewTrialCheckInSentAction)}
        >
          Mark Trial Check-in Sent
        </button>
        <button
          type="button"
          className="review-trial-secondary-btn"
          disabled={isPending}
          onClick={() => mark("Renewal reminder", markReviewRenewalReminderSentAction)}
        >
          Mark Renewal Reminder Sent
        </button>
        <button
          type="button"
          className="review-trial-secondary-btn"
          disabled={isPending}
          onClick={() => mark("Expired reminder 1", markReviewExpiredReminder1SentAction)}
        >
          Mark Expired Reminder Sent
        </button>
        <button
          type="button"
          className="review-trial-secondary-btn"
          disabled={isPending}
          onClick={() => mark("Expired follow-up 1", markReviewExpiredFollowUp1SentAction)}
        >
          Mark Expired Follow-up 1 Sent
        </button>
        <button
          type="button"
          className="review-trial-secondary-btn"
          disabled={isPending}
          onClick={() => mark("Expired follow-up 2", markReviewExpiredFollowUp2SentAction)}
        >
          Mark Expired Follow-up 2 Sent
        </button>
      </div>
      {feedback || error ? (
        <div className="review-trial-actions-status">
          {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
          {error ? <span className="reply-form-error">{error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
