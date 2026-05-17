"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReviewTrialStatus } from "@/reviewTrialConstants";
import { REVIEW_PLAN_TYPES } from "@/reviewPlanConstants";
import {
  canStartReviewTrial,
  canStopReviewTrial,
  reviewTrialStatusBadgeClass,
} from "@/reviewPlanFollowUp";
import {
  startOneMonthReviewTrialAction,
  stopReviewTrialAction,
  updateReviewTrialAction,
  type ReviewTrialSavedSnapshot,
} from "./actions";
import { ReviewFollowUpTracking } from "./ReviewFollowUpTracking";

type Props = {
  leadId: string;
  displayStatus: ReviewTrialStatus;
  planType: string | null;
  startDate: string;
  endDate: string;
  publicUrl: string | null;
  merchantUrl: string | null;
  notes: string | null;
  checkInSentAt: string | null;
  renewalReminderSentAt: string | null;
  expiredReminder1SentAt: string | null;
  expiredFollowUp1SentAt: string | null;
  expiredFollowUp2SentAt: string | null;
};

function startPlanButtonLabel(planType: string): string {
  switch (planType) {
    case "Monthly Paid":
      return "Start monthly plan today";
    case "Yearly Paid":
      return "Start yearly plan today";
    default:
      return "Start 1-month trial today";
  }
}

export function ReviewTrialForm({
  leadId,
  displayStatus,
  planType,
  startDate,
  endDate,
  publicUrl,
  merchantUrl,
  notes,
  checkInSentAt,
  renewalReminderSentAt,
  expiredReminder1SentAt,
  expiredFollowUp1SentAt,
  expiredFollowUp2SentAt,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reviewPlanType, setReviewPlanType] = useState(planType ?? "");
  const [trialStartDate, setTrialStartDate] = useState(startDate);
  const [trialEndDate, setTrialEndDate] = useState(endDate);
  const [reviewPublicUrl, setReviewPublicUrl] = useState(publicUrl ?? "");
  const [reviewMerchantUrl, setReviewMerchantUrl] = useState(merchantUrl ?? "");
  const [trialNotes, setTrialNotes] = useState(notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDisplayStatus, setCurrentDisplayStatus] = useState(displayStatus);

  useEffect(() => {
    setReviewPlanType(planType ?? "");
    setTrialStartDate(startDate);
    setTrialEndDate(endDate);
    setCurrentDisplayStatus(displayStatus);
  }, [planType, startDate, endDate, displayStatus]);

  const startPlanEnabled = canStartReviewTrial(currentDisplayStatus);
  const stopPlanEnabled = canStopReviewTrial(currentDisplayStatus);
  const startPlanLabel = startPlanEnabled
    ? startPlanButtonLabel(reviewPlanType)
    : currentDisplayStatus === "Converted Paid"
      ? "Converted — cannot restart plan"
      : "Active plan already started";

  function applySavedSnapshot(saved: ReviewTrialSavedSnapshot) {
    setReviewPlanType(saved.planType ?? "");
    setTrialStartDate(saved.startDate);
    setTrialEndDate(saved.endDate);
    setCurrentDisplayStatus(saved.displayStatus);
  }

  function save() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void updateReviewTrialAction({
        leadId,
        planType: reviewPlanType || null,
        startDate: trialStartDate || null,
        endDate: trialEndDate || null,
        publicUrl: reviewPublicUrl || null,
        merchantUrl: reviewMerchantUrl || null,
        notes: trialNotes || null,
      }).then((result) => {
        if (result.ok) {
          if (result.saved) {
            applySavedSnapshot(result.saved);
          }
          setFeedback("Saved");
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  function startPlan() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void startOneMonthReviewTrialAction(leadId, reviewPlanType || null).then((result) => {
        if (result.ok) {
          if (result.saved) {
            applySavedSnapshot(result.saved);
          }
          setFeedback("Plan started");
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  function stopPlan() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void stopReviewTrialAction(leadId).then((result) => {
        if (result.ok) {
          if (result.saved) {
            applySavedSnapshot(result.saved);
          }
          setFeedback("Plan stopped");
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
        <span className={reviewTrialStatusBadgeClass(currentDisplayStatus)}>
          {currentDisplayStatus}
        </span>
        <p className="review-trial-status-hint">
          Status is calculated from plan type, dates, and plan actions. It cannot be edited manually.
        </p>
      </div>
      <label className="reply-form-label">
        Plan type
        <select
          className="reply-form-select"
          value={reviewPlanType}
          onChange={(e) => setReviewPlanType(e.target.value)}
          disabled={isPending}
        >
          <option value="">— Select plan —</option>
          {REVIEW_PLAN_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <div className="review-trial-grid">
        <label className="reply-form-label">
          Plan start date
          <input
            type="date"
            className="reply-form-input"
            value={trialStartDate}
            onChange={(e) => setTrialStartDate(e.target.value)}
            disabled={isPending}
          />
        </label>
        <label className="reply-form-label">
          Plan end date
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
            {isPending ? "Saving..." : "Save Plan"}
          </button>
          <button
            type="button"
            className="review-trial-secondary-btn"
            onClick={startPlan}
            disabled={isPending || !startPlanEnabled}
          >
            {startPlanLabel}
          </button>
        </div>
        {stopPlanEnabled ? (
          <div className="review-trial-actions-danger">
            <button
              type="button"
              className="review-trial-danger-btn"
              onClick={stopPlan}
              disabled={isPending}
            >
              Stop Plan
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
      <ReviewFollowUpTracking
        leadId={leadId}
        checkInSentAt={checkInSentAt}
        renewalReminderSentAt={renewalReminderSentAt}
        expiredReminder1SentAt={expiredReminder1SentAt}
        expiredFollowUp1SentAt={expiredFollowUp1SentAt}
        expiredFollowUp2SentAt={expiredFollowUp2SentAt}
      />
    </div>
  );
}
