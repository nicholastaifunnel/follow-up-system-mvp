"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearReviewTrialAction,
  startOneMonthReviewTrialAction,
  updateReviewTrialAction,
} from "./actions";
import { REVIEW_TRIAL_STATUSES } from "@/reviewTrialConstants";

type Props = {
  leadId: string;
  status: string | null;
  startDate: string;
  endDate: string;
  publicUrl: string | null;
  merchantUrl: string | null;
  notes: string | null;
};

export function ReviewTrialForm({
  leadId,
  status,
  startDate,
  endDate,
  publicUrl,
  merchantUrl,
  notes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [trialStatus, setTrialStatus] = useState(status ?? "Not Started");
  const [trialStartDate, setTrialStartDate] = useState(startDate);
  const [trialEndDate, setTrialEndDate] = useState(endDate);
  const [reviewPublicUrl, setReviewPublicUrl] = useState(publicUrl ?? "");
  const [reviewMerchantUrl, setReviewMerchantUrl] = useState(merchantUrl ?? "");
  const [trialNotes, setTrialNotes] = useState(notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void updateReviewTrialAction({
        leadId,
        status: trialStatus,
        startDate: trialStartDate || null,
        endDate: trialEndDate || null,
        publicUrl: reviewPublicUrl || null,
        merchantUrl: reviewMerchantUrl || null,
        notes: trialNotes || null,
      }).then((result) => {
        if (result.ok) {
          setFeedback("Saved");
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  function startTrial() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void startOneMonthReviewTrialAction(leadId).then((result) => {
        if (result.ok) {
          setFeedback("1-month trial started");
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  function clearTrial() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void clearReviewTrialAction(leadId).then((result) => {
        if (result.ok) {
          setTrialStatus("Not Started");
          setTrialStartDate("");
          setTrialEndDate("");
          setReviewPublicUrl("");
          setReviewMerchantUrl("");
          setTrialNotes("");
          setFeedback("Cleared");
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <div className="review-trial-form">
      <div className="review-trial-grid">
        <label className="reply-form-label">
          Status
          <select
            className="reply-form-select"
            value={trialStatus}
            onChange={(e) => setTrialStatus(e.target.value)}
            disabled={isPending}
          >
            {REVIEW_TRIAL_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="reply-form-label">
          Trial start date
          <input
            type="date"
            className="reply-form-input"
            value={trialStartDate}
            onChange={(e) => setTrialStartDate(e.target.value)}
            disabled={isPending}
          />
        </label>
        <label className="reply-form-label">
          Trial end date
          <input
            type="date"
            className="reply-form-input"
            value={trialEndDate}
            onChange={(e) => setTrialEndDate(e.target.value)}
            disabled={isPending}
          />
        </label>
      </div>
      <label className="reply-form-label">
        Public review link
        <input
          type="url"
          className="reply-form-input"
          value={reviewPublicUrl}
          onChange={(e) => setReviewPublicUrl(e.target.value)}
          disabled={isPending}
        />
      </label>
      <label className="reply-form-label">
        Merchant/admin link
        <input
          type="url"
          className="reply-form-input"
          value={reviewMerchantUrl}
          onChange={(e) => setReviewMerchantUrl(e.target.value)}
          disabled={isPending}
        />
      </label>
      <label className="reply-form-label">
        Notes
        <textarea
          className="reply-form-textarea"
          rows={4}
          value={trialNotes}
          onChange={(e) => setTrialNotes(e.target.value)}
          disabled={isPending}
        />
      </label>
      <div className="review-trial-actions">
        <button type="button" className="reply-form-submit" onClick={save} disabled={isPending}>
          {isPending ? "Saving..." : "Save Trial"}
        </button>
        <button type="button" className="review-trial-secondary-btn" onClick={startTrial} disabled={isPending}>
          Start 1-month trial today
        </button>
        <button type="button" className="review-trial-danger-btn" onClick={clearTrial} disabled={isPending}>
          Clear Trial Info
        </button>
        {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
        {error ? <span className="reply-form-error">{error}</span> : null}
      </div>
    </div>
  );
}
