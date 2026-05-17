"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReviewTrialStatus } from "@/reviewTrialConstants";
import {
  canStartReviewTrial,
  canStopReviewTrial,
  reviewTrialStatusBadgeClass,
} from "@/reviewTrialStatus";
import {
  startOneMonthReviewTrialAction,
  stopReviewTrialAction,
  updateReviewTrialAction,
} from "./actions";

type Props = {
  leadId: string;
  displayStatus: ReviewTrialStatus;
  startDate: string;
  endDate: string;
  publicUrl: string | null;
  merchantUrl: string | null;
  notes: string | null;
};

export function ReviewTrialForm({
  leadId,
  displayStatus,
  startDate,
  endDate,
  publicUrl,
  merchantUrl,
  notes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [trialStartDate, setTrialStartDate] = useState(startDate);
  const [trialEndDate, setTrialEndDate] = useState(endDate);
  const [reviewPublicUrl, setReviewPublicUrl] = useState(publicUrl ?? "");
  const [reviewMerchantUrl, setReviewMerchantUrl] = useState(merchantUrl ?? "");
  const [trialNotes, setTrialNotes] = useState(notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTrialEnabled = canStartReviewTrial(displayStatus);
  const stopTrialEnabled = canStopReviewTrial(displayStatus);
  const startTrialLabel = startTrialEnabled
    ? "Start 1-month trial today"
    : displayStatus === "Converted Paid"
      ? "Converted — cannot restart trial"
      : "Active trial already started";

  function save() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void updateReviewTrialAction({
        leadId,
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

  function stopTrial() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void stopReviewTrialAction(leadId).then((result) => {
        if (result.ok) {
          setFeedback("Trial stopped");
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <div className="review-trial-form">
      <div className="review-trial-status-readonly">
        <span className="reply-form-label">Status</span>
        <span className={reviewTrialStatusBadgeClass(displayStatus)}>
          {displayStatus}
        </span>
        <p className="review-trial-status-hint">
          Status is calculated from dates and trial actions. It cannot be edited manually.
        </p>
      </div>
      <div className="review-trial-grid">
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
        <div className="review-trial-actions-left">
          <button type="button" className="reply-form-submit" onClick={save} disabled={isPending}>
            {isPending ? "Saving..." : "Save Trial"}
          </button>
          <button
            type="button"
            className="review-trial-secondary-btn"
            onClick={startTrial}
            disabled={isPending || !startTrialEnabled}
          >
            {startTrialLabel}
          </button>
        </div>
        {stopTrialEnabled ? (
          <div className="review-trial-actions-danger">
            <button
              type="button"
              className="review-trial-danger-btn"
              onClick={stopTrial}
              disabled={isPending}
            >
              Stop Trial
            </button>
          </div>
        ) : null}
        {feedback || error ? (
          <div className="review-trial-actions-status">
            {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
            {error ? <span className="reply-form-error">{error}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
