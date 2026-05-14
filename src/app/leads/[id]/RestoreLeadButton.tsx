"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreLeadAction } from "./actions";

type Props = {
  leadId: string;
  /** Shorter label when used in a table cell */
  compact?: boolean;
};

export function RestoreLeadButton({ leadId, compact }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRestore() {
    setError(null);
    start(() => {
      void restoreLeadAction(leadId).then((r) => {
        if (r.ok) {
          router.refresh();
        } else {
          setError(r.error);
        }
      });
    });
  }

  return (
    <div className="restore-lead-wrap">
      <button
        type="button"
        className="restore-lead-btn"
        onClick={onRestore}
        disabled={pending}
      >
        {pending ? "…" : compact ? "Restore" : "Restore / Unskip"}
      </button>
      {error ? <p className="skip-lead-error">{error}</p> : null}
    </div>
  );
}
