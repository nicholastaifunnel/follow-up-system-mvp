"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReviewTrialStatus } from "@/reviewTrialConstants";
import {
  getDefaultPlanAmountCents,
  isReviewPlanType,
  REVIEW_PLAN_TYPES,
} from "@/reviewPlanConstants";
import {
  canStartReviewTrial,
  canStopReviewTrial,
  reviewTrialStatusBadgeClass,
} from "@/reviewPlanFollowUp";
import { centsToRmInput } from "@/money";
import {
  startOneMonthReviewTrialAction,
  stopReviewTrialAction,
  updateReviewTrialAction,
  type ReviewTrialSavedSnapshot,
} from "./actions";
import { ReviewFollowUpTracking } from "./ReviewFollowUpTracking";

const START_PLAN_CONFIRM_MESSAGE =
  "Starting a new plan will clear the current review follow-up drafts and sent records for this customer. The plan usage history will be saved. Continue?";

type Props = {
  leadId: string;
  displayStatus: ReviewTrialStatus;
  reviewTrialStatus: string | null;
  planType: string | null;
  planAmountCents: number | null;
  startDate: string;
  endDate: string;
  publicUrl: string | null;
  merchantUrl: string | null;
  notes: string | null;
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone: string | null;
  checkInDraft: string | null;
  renewalDraft: string | null;
  expiredReminder1Draft: string | null;
  expiredFollowUp1Draft: string | null;
  expiredFollowUp2Draft: string | null;
  checkInSentAt: string | null;
  renewalReminderSentAt: string | null;
  expiredReminder1SentAt: string | null;
  expiredFollowUp1SentAt: string | null;
  expiredFollowUp2SentAt: string | null;
};

function defaultPriceInputForPlanType(planType: string): string {
  if (!isReviewPlanType(planType)) return "";
  return centsToRmInput(getDefaultPlanAmountCents(planType));
}

function startPlanButtonLabel(planType: string, isRenew: boolean): string {
  switch (planType) {
    case "Monthly Paid":
      return isRenew ? "Renew monthly plan" : "Start monthly plan today";
    case "Yearly Paid":
      return isRenew ? "Renew yearly plan" : "Start yearly plan today";
    default:
      return "Start 1-month trial today";
  }
}

export function ReviewTrialForm({
  leadId,
  displayStatus,
  reviewTrialStatus,
  planType,
  planAmountCents,
  startDate,
  endDate,
  publicUrl,
  merchantUrl,
  notes,
  phone,
  internationalPhone,
  whatsappPhone,
  checkInDraft,
  renewalDraft,
  expiredReminder1Draft,
  expiredFollowUp1Draft,
  expiredFollowUp2Draft,
  checkInSentAt,
  renewalReminderSentAt,
  expiredReminder1SentAt,
  expiredFollowUp1SentAt,
  expiredFollowUp2SentAt,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reviewPlanType, setReviewPlanType] = useState(planType ?? "");
  const [planPrice, setPlanPrice] = useState(
    centsToRmInput(planAmountCents ?? (planType && isReviewPlanType(planType) ? getDefaultPlanAmountCents(planType) : null)),
  );
  const priceTouchedRef = useRef(false);
  const [trialStartDate, setTrialStartDate] = useState(startDate);
  const [trialEndDate, setTrialEndDate] = useState(endDate);
  const [reviewPublicUrl, setReviewPublicUrl] = useState(publicUrl ?? "");
  const [reviewMerchantUrl, setReviewMerchantUrl] = useState(merchantUrl ?? "");
  const [trialNotes, setTrialNotes] = useState(notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDisplayStatus, setCurrentDisplayStatus] = useState(displayStatus);
  const [followUpDrafts, setFollowUpDrafts] = useState({
    checkInDraft,
    renewalDraft,
    expiredReminder1Draft,
    expiredFollowUp1Draft,
    expiredFollowUp2Draft,
  });
  const [followUpSentAt, setFollowUpSentAt] = useState({
    checkInSentAt,
    renewalReminderSentAt,
    expiredReminder1SentAt,
    expiredFollowUp1SentAt,
    expiredFollowUp2SentAt,
  });

  useEffect(() => {
    setReviewPlanType(planType ?? "");
    setPlanPrice(
      centsToRmInput(
        planAmountCents ??
          (planType && isReviewPlanType(planType) ? getDefaultPlanAmountCents(planType) : null),
      ),
    );
    priceTouchedRef.current = false;
    setTrialStartDate(startDate);
    setTrialEndDate(endDate);
    setCurrentDisplayStatus(displayStatus);
    setFollowUpDrafts({
      checkInDraft,
      renewalDraft,
      expiredReminder1Draft,
      expiredFollowUp1Draft,
      expiredFollowUp2Draft,
    });
    setFollowUpSentAt({
      checkInSentAt,
      renewalReminderSentAt,
      expiredReminder1SentAt,
      expiredFollowUp1SentAt,
      expiredFollowUp2SentAt,
    });
  }, [
    planType,
    planAmountCents,
    startDate,
    endDate,
    displayStatus,
    checkInDraft,
    renewalDraft,
    expiredReminder1Draft,
    expiredFollowUp1Draft,
    expiredFollowUp2Draft,
    checkInSentAt,
    renewalReminderSentAt,
    expiredReminder1SentAt,
    expiredFollowUp1SentAt,
    expiredFollowUp2SentAt,
  ]);

  const startPlanEnabled = canStartReviewTrial(currentDisplayStatus);
  const stopPlanEnabled = canStopReviewTrial(currentDisplayStatus);
  const isRenew = startPlanEnabled && currentDisplayStatus !== "Not Started";
  const startPlanLabel = startPlanEnabled
    ? startPlanButtonLabel(reviewPlanType, isRenew)
    : currentDisplayStatus === "Converted Paid"
      ? "Converted — cannot restart plan"
      : "Active plan already started";

  function applySavedSnapshot(saved: ReviewTrialSavedSnapshot) {
    setReviewPlanType(saved.planType ?? "");
    setTrialStartDate(saved.startDate);
    setTrialEndDate(saved.endDate);
    setPlanPrice(centsToRmInput(saved.amountCents));
    priceTouchedRef.current = false;
    setCurrentDisplayStatus(saved.displayStatus);
    setFollowUpDrafts({
      checkInDraft: saved.checkInDraft,
      renewalDraft: saved.renewalDraft,
      expiredReminder1Draft: saved.expiredReminder1Draft,
      expiredFollowUp1Draft: saved.expiredFollowUp1Draft,
      expiredFollowUp2Draft: saved.expiredFollowUp2Draft,
    });
    setFollowUpSentAt({
      checkInSentAt: saved.checkInSentAt,
      renewalReminderSentAt: saved.renewalReminderSentAt,
      expiredReminder1SentAt: saved.expiredReminder1SentAt,
      expiredFollowUp1SentAt: saved.expiredFollowUp1SentAt,
      expiredFollowUp2SentAt: saved.expiredFollowUp2SentAt,
    });
  }

  function handlePlanTypeChange(nextType: string) {
    setReviewPlanType(nextType);
    if (!priceTouchedRef.current || planPrice.trim() === "") {
      setPlanPrice(defaultPriceInputForPlanType(nextType));
    }
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
        planPrice,
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

  function runStartPlan() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void startOneMonthReviewTrialAction(
        leadId,
        reviewPlanType || null,
        planPrice,
        isRenew,
      ).then(
        (result) => {
          if (result.ok) {
            if (result.saved) {
              applySavedSnapshot(result.saved);
            }
            setFeedback(isRenew ? "Plan renewed" : "Plan started");
            router.refresh();
          } else {
            setError(result.error);
          }
        },
      );
    });
  }

  function startPlan() {
    if (!window.confirm(START_PLAN_CONFIRM_MESSAGE)) {
      return;
    }
    runStartPlan();
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
          onChange={(e) => handlePlanTypeChange(e.target.value)}
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
      <label className="reply-form-label">
        Plan price
        <div className="review-plan-price-input-wrap">
          <span className="review-plan-price-prefix" aria-hidden="true">
            RM
          </span>
          <input
            type="text"
            className="reply-form-input review-plan-price-input"
            value={planPrice}
            onChange={(e) => {
              priceTouchedRef.current = true;
              setPlanPrice(e.target.value);
            }}
            placeholder={reviewPlanType ? defaultPriceInputForPlanType(reviewPlanType) : "0"}
            disabled={isPending}
            inputMode="decimal"
          />
        </div>
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
        phone={phone}
        internationalPhone={internationalPhone}
        whatsappPhone={whatsappPhone}
        reviewTrialStatus={reviewTrialStatus}
        reviewPlanType={reviewPlanType || planType}
        reviewTrialStartAt={trialStartDate || null}
        reviewTrialEndAt={trialEndDate || null}
        checkInDraft={followUpDrafts.checkInDraft}
        renewalDraft={followUpDrafts.renewalDraft}
        expiredReminder1Draft={followUpDrafts.expiredReminder1Draft}
        expiredFollowUp1Draft={followUpDrafts.expiredFollowUp1Draft}
        expiredFollowUp2Draft={followUpDrafts.expiredFollowUp2Draft}
        checkInSentAt={followUpSentAt.checkInSentAt}
        renewalReminderSentAt={followUpSentAt.renewalReminderSentAt}
        expiredReminder1SentAt={followUpSentAt.expiredReminder1SentAt}
        expiredFollowUp1SentAt={followUpSentAt.expiredFollowUp1SentAt}
        expiredFollowUp2SentAt={followUpSentAt.expiredFollowUp2SentAt}
      />
    </div>
  );
}
