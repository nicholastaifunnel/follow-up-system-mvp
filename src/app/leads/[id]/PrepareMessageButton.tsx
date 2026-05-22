"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { prepareLeadMessageAction } from "./actions";

type Props = {
  leadId: string;
  canPrepare: boolean;
  /** Shown when `canPrepare` is false (UI hint only). */
  reason: string;
  label?: string;
  messageStage?: string;
};

export function PrepareMessageButton({
  leadId,
  canPrepare,
  reason,
  label = "Prepare Message",
  messageStage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canPrepare) {
    return (
      <p className="prepare-blocked">
        {reason || "This lead cannot be prepared from the current status."}
      </p>
    );
  }

  function onClick() {
    setError(null);
    startTransition(() => {
      void prepareLeadMessageAction(leadId, messageStage).then((result) => {
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <div className="prepare-message-wrap">
      <button
        type="button"
        className="prepare-message-btn"
        onClick={onClick}
        disabled={isPending}
      >
        {isPending ? "Preparing..." : label}
      </button>
      {error ? <p className="prepare-error">{error}</p> : null}
    </div>
  );
}
