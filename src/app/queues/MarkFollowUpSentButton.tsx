"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markFirstFollowUpSentAction,
  markSecondFollowUpSentAction,
} from "./actions";

type Props = {
  leadId: string;
  which: 1 | 2;
};

const LABELS: Record<1 | 2, { pending: string; idle: string }> = {
  1: {
    idle: "Mark first follow-up sent",
    pending: "Marking…",
  },
  2: {
    idle: "Mark second follow-up sent",
    pending: "Marking…",
  },
};

export function MarkFollowUpSentButton({ leadId, which }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(() => {
      const action =
        which === 1 ? markFirstFollowUpSentAction : markSecondFollowUpSentAction;
      void action(leadId).then((result) => {
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <div className="queue-follow-up-mark-wrap">
      <button
        type="button"
        className="mark-sent-btn queue-follow-up-mark-btn"
        onClick={onClick}
        disabled={isPending}
      >
        {isPending ? LABELS[which].pending : LABELS[which].idle}
      </button>
      {error ? <p className="mark-sent-error">{error}</p> : null}
    </div>
  );
}
