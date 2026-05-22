"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDateOnlyMYT, formatDateTimeMYT } from "@/formatMalaysiaTime";
import {
  getReviewPlanFollowUpState,
  isFollowUpUpcomingSoon,
  type ReviewPlanLeadFields,
} from "@/reviewPlanFollowUp";
import type { ReviewFollowUpActionKey, ReviewFollowUpItemStatus } from "@/reviewPlanConstants";
import type { ReviewFollowUpItem } from "@/reviewPlanFollowUp";
import {
  generateReviewFollowUpDraftAction,
  markReviewFollowUpSentAction,
  updateReviewFollowUpDraftAction,
} from "./actions";
import { CopyMessageButton } from "./CopyMessageButton";
import { OpenWhatsAppButton } from "./OpenWhatsAppButton";

type Props = {
  leadId: string;
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone: string | null;
  reviewTrialStatus: string | null;
  reviewPlanType: string | null;
  reviewTrialStartAt: string | null;
  reviewTrialEndAt: string | null;
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

const DRAFT_PROP_BY_KEY: Record<
  ReviewFollowUpActionKey,
  keyof Pick<
    Props,
    | "checkInDraft"
    | "renewalDraft"
    | "expiredReminder1Draft"
    | "expiredFollowUp1Draft"
    | "expiredFollowUp2Draft"
  >
> = {
  "trial-check-in": "checkInDraft",
  "renewal-reminder": "renewalDraft",
  "expired-reminder-1": "expiredReminder1Draft",
  "expired-follow-up-1": "expiredFollowUp1Draft",
  "expired-follow-up-2": "expiredFollowUp2Draft",
};

const SENT_PROP_BY_KEY: Record<
  ReviewFollowUpActionKey,
  keyof Pick<
    Props,
    | "checkInSentAt"
    | "renewalReminderSentAt"
    | "expiredReminder1SentAt"
    | "expiredFollowUp1SentAt"
    | "expiredFollowUp2SentAt"
  >
> = {
  "trial-check-in": "checkInSentAt",
  "renewal-reminder": "renewalReminderSentAt",
  "expired-reminder-1": "expiredReminder1SentAt",
  "expired-follow-up-1": "expiredFollowUp1SentAt",
  "expired-follow-up-2": "expiredFollowUp2SentAt",
};

function parseDateInput(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLeadFields(props: Props): ReviewPlanLeadFields {
  return {
    reviewTrialStatus: props.reviewTrialStatus,
    reviewPlanType: props.reviewPlanType,
    reviewTrialStartAt: parseDateInput(props.reviewTrialStartAt),
    reviewTrialEndAt: parseDateInput(props.reviewTrialEndAt),
    reviewTrialCheckInSentAt: parseDateInput(props.checkInSentAt),
    reviewRenewalReminderSentAt: parseDateInput(props.renewalReminderSentAt),
    reviewExpiredReminder1SentAt: parseDateInput(props.expiredReminder1SentAt),
    reviewExpiredFollowUp1SentAt: parseDateInput(props.expiredFollowUp1SentAt),
    reviewExpiredFollowUp2SentAt: parseDateInput(props.expiredFollowUp2SentAt),
  };
}

function itemStatusClass(status: ReviewFollowUpItemStatus): string {
  if (status === "Due") return "review-follow-up-item review-follow-up-item--due";
  if (status === "Sent") return "review-follow-up-item review-follow-up-item--sent";
  return "review-follow-up-item review-follow-up-item--pending";
}

function FollowUpDraftTextarea({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      id={id}
      className="reply-form-textarea review-follow-up-draft-textarea"
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function ReviewFollowUpCompactRow({
  item,
  sentAt,
}: {
  item: ReviewFollowUpItem;
  sentAt: string | null;
}) {
  return (
    <li className="review-follow-up-compact-row">
      <span className="review-follow-up-compact-label">{item.label}</span>
      <span className="review-follow-up-compact-meta">
        {item.status === "Sent" && sentAt
          ? `Sent at ${formatDateTimeMYT(new Date(sentAt))}`
          : item.dueDate
            ? `Due ${formatDateOnlyMYT(item.dueDate)}`
            : item.status}
      </span>
    </li>
  );
}

function ReviewFollowUpWorkspace({
  leadId,
  phone,
  internationalPhone,
  whatsappPhone,
  item,
  initialDraft,
  initialSentAt,
}: {
  leadId: string;
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone: string | null;
  item: ReviewFollowUpItem;
  initialDraft: string | null;
  initialSentAt: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const saved = initialDraft ?? "";
  const [draft, setDraft] = useState(saved);
  const [savedBaseline, setSavedBaseline] = useState(saved);
  const [sentAt, setSentAt] = useState(initialSentAt);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markSuccess, setMarkSuccess] = useState(false);

  useEffect(() => {
    setDraft(saved);
    setSavedBaseline(saved);
    setSentAt(initialSentAt);
  }, [saved, initialSentAt]);

  const isDirty = draft !== savedBaseline;
  const hasSavedDraft = savedBaseline.trim().length > 0;
  const hasEditorContent = draft.trim().length > 0;
  const textareaId = `review-follow-up-draft-${item.actionKey}`;
  const savedDraftForWhatsApp = savedBaseline.trim();

  function generate() {
    setError(null);
    setSaveFeedback(null);
    startTransition(() => {
      void generateReviewFollowUpDraftAction(leadId, item.actionKey).then((result) => {
        if (result.ok) {
          setDraft(result.draft);
          setSavedBaseline(result.draft);
          if (result.sentAt) setSentAt(result.sentAt);
        } else {
          setError(result.error ?? "Could not generate message.");
        }
      });
    });
  }

  function saveDraft() {
    setError(null);
    setSaveFeedback(null);
    startTransition(() => {
      void updateReviewFollowUpDraftAction(leadId, item.actionKey, draft).then((result) => {
        if (result.ok) {
          setSavedBaseline(result.draft);
          setDraft(result.draft);
          if (result.sentAt) setSentAt(result.sentAt);
          setSaveFeedback("Saved");
          window.setTimeout(() => setSaveFeedback(null), 2500);
        } else {
          setError(result.error ?? "Could not save draft.");
        }
      });
    });
  }

  function markSent() {
    setError(null);
    setMarkSuccess(false);
    if (!hasSavedDraft) {
      setError("Generate and save a message before marking as sent.");
      return;
    }
    if (isDirty) {
      setError("Save draft before marking as sent.");
      return;
    }
    startTransition(() => {
      void markReviewFollowUpSentAction(leadId, item.actionKey).then((result) => {
        if (result.ok) {
          setSentAt(result.sentAt);
          setMarkSuccess(true);
          router.refresh();
        } else {
          setError(result.error ?? "Could not mark as sent.");
        }
      });
    });
  }

  return (
    <li className={itemStatusClass(item.status)}>
      <div className="review-follow-up-item-main">
        <span className="review-follow-up-item-name">{item.label}</span>
        <span className="review-follow-up-status review-follow-up-status--due">{item.status}</span>
      </div>
      <p className="review-follow-up-workspace-due">
        Due {formatDateOnlyMYT(item.dueDate)}
        {sentAt ? ` · Sent at ${formatDateTimeMYT(new Date(sentAt))}` : ""}
      </p>

      <div className="review-follow-up-item-workspace">
        <div className="review-follow-up-item-actions">
          <button
            type="button"
            className="review-trial-secondary-btn"
            disabled={isPending}
            onClick={generate}
          >
            {isPending ? "Working…" : "Generate message"}
          </button>
          {hasEditorContent ? <CopyMessageButton text={draft} /> : null}
          <button
            type="button"
            className="reply-form-submit message-workspace-save-draft"
            onClick={saveDraft}
            disabled={isPending || !isDirty || !hasEditorContent}
          >
            {isPending ? "Saving…" : "Save draft"}
          </button>
        </div>

        {hasEditorContent ? (
          <div className="review-follow-up-draft">
            <label className="reply-form-label" htmlFor={textareaId}>
              Message draft
            </label>
            <FollowUpDraftTextarea
              id={textareaId}
              value={draft}
              onChange={setDraft}
              disabled={isPending}
            />
            <div className="review-follow-up-draft-meta">
              {isDirty ? (
                <span className="message-workspace-unsaved">Unsaved changes</span>
              ) : hasSavedDraft ? (
                <span className="reply-form-saved">Draft saved</span>
              ) : null}
              {saveFeedback ? <span className="reply-form-saved">{saveFeedback}</span> : null}
            </div>
          </div>
        ) : (
          <p className="review-follow-up-hint">
            Generate a message, edit it, then save the draft before WhatsApp or Mark sent.
          </p>
        )}

        <div className="review-follow-up-item-actions review-follow-up-item-actions--secondary">
          <OpenWhatsAppButton
            phone={phone}
            internationalPhone={internationalPhone}
            whatsappPhone={whatsappPhone}
            preparedMessage={savedDraftForWhatsApp || null}
            label="Open WhatsApp"
          />
          <button
            type="button"
            className="mark-sent-btn"
            disabled={isPending || !hasSavedDraft || isDirty}
            onClick={markSent}
          >
            {isPending ? "Marking…" : "Mark sent"}
          </button>
        </div>

        {!hasSavedDraft ? (
          <p className="review-follow-up-hint review-follow-up-hint--muted">
            Open WhatsApp uses the saved draft only. Mark sent needs a saved draft.
          </p>
        ) : isDirty ? (
          <p className="review-follow-up-hint review-follow-up-hint--muted">
            Save draft before opening WhatsApp or marking sent.
          </p>
        ) : null}
      </div>

      {error ? <p className="reply-form-error">{error}</p> : null}
      {markSuccess ? <p className="reply-form-saved">Marked as sent.</p> : null}
    </li>
  );
}

export function ReviewFollowUpTracking(props: Props) {
  const followUpState = useMemo(
    () => getReviewPlanFollowUpState(toLeadFields(props)),
    [props],
  );

  const dueItem =
    followUpState.followUpItems.find((item) => item.status === "Due") ?? null;
  const upcomingItem =
    !dueItem
      ? (followUpState.followUpItems.find((item) => isFollowUpUpcomingSoon(item)) ?? null)
      : null;
  const sentItems = followUpState.followUpItems.filter((item) => item.status === "Sent");

  const showEmpty =
    !dueItem &&
    !upcomingItem &&
    followUpState.nextActionReason === "No action needed";

  return (
    <div className="review-follow-up-tracking">
      <h3 className="review-follow-up-heading">Follow-up tracking</h3>

      {showEmpty ? (
        <p className="review-follow-up-empty">No review follow-up needed right now.</p>
      ) : (
        <ul className="review-follow-up-item-list">
          {dueItem ? (
            <ReviewFollowUpWorkspace
              leadId={props.leadId}
              phone={props.phone}
              internationalPhone={props.internationalPhone}
              whatsappPhone={props.whatsappPhone}
              item={dueItem}
              initialDraft={props[DRAFT_PROP_BY_KEY[dueItem.actionKey]]}
              initialSentAt={props[SENT_PROP_BY_KEY[dueItem.actionKey]]}
            />
          ) : null}

          {upcomingItem ? (
            <li className="review-follow-up-upcoming">
              <span className="review-follow-up-item-name">{upcomingItem.label}</span>
              <p className="review-follow-up-upcoming-text">
                Upcoming on {formatDateOnlyMYT(upcomingItem.dueDate)}. The full message workspace
                opens when this follow-up is due.
              </p>
            </li>
          ) : null}

          {!dueItem
            ? sentItems.map((item) => (
                <ReviewFollowUpCompactRow
                  key={item.actionKey}
                  item={item}
                  sentAt={props[SENT_PROP_BY_KEY[item.actionKey]]}
                />
              ))
            : null}
        </ul>
      )}
    </div>
  );
}
