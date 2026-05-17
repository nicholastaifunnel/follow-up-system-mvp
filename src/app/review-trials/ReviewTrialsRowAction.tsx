"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReviewFollowUpActionKey } from "@/reviewPlanConstants";
import { markReviewFollowUpSentAction } from "@/app/leads/[id]/actions";

type Props = {
  leadId: string;
  nextActionKey: ReviewFollowUpActionKey | null;
  nextActionLabel: string | null;
};

export function ReviewTrialsRowAction({ leadId, nextActionKey, nextActionLabel }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function markSent() {
    if (!nextActionKey) return;
    setError(null);
    startTransition(() => {
      void markReviewFollowUpSentAction(leadId, nextActionKey).then((result) => {
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error ?? "Could not save.");
        }
      });
    });
  }

  return (
    <div className="review-trial-row-action">
      <Link className="review-trial-action-link" href={`/leads/${leadId}`}>
        View Lead
      </Link>
      {nextActionKey && nextActionLabel ? (
        <button
          type="button"
          className="review-trial-secondary-btn review-trial-row-mark-btn"
          disabled={isPending}
          onClick={markSent}
        >
          {isPending ? "Saving..." : nextActionLabel}
        </button>
      ) : null}
      {error ? <span className="reply-form-error">{error}</span> : null}
    </div>
  );
}
