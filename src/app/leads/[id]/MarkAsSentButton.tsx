"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markLeadAsSentAction } from "./actions";

type Props = {
  leadId: string;
  canMarkSent: boolean;
  reason: string;
};

export function MarkAsSentButton({ leadId, canMarkSent, reason }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!canMarkSent) {
    return <p className="mark-sent-blocked">{reason}</p>;
  }

  function onClick() {
    setError(null);
    setSuccess(false);
    startTransition(() => {
      void markLeadAsSentAction(leadId).then((result) => {
        if (result.ok) {
          setSuccess(true);
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <div className="mark-sent-wrap">
      <button
        type="button"
        className="mark-sent-btn"
        onClick={onClick}
        disabled={isPending}
      >
        {isPending ? "Marking..." : "Mark as Sent"}
      </button>
      {error ? <p className="mark-sent-error">{error}</p> : null}
      {success ? <p className="mark-sent-success">Marked as sent.</p> : null}
    </div>
  );
}
