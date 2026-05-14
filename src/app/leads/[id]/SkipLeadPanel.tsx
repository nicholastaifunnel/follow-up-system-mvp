"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { skipLeadForDetailAction } from "./actions";
import {
  SKIP_REASON_VALUES,
  skipReasonLabel,
  type SkipReasonValue,
} from "@/skipLeadReasons";

type Props = {
  leadId: string;
};

export function SkipLeadPanel({ leadId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState<SkipReasonValue>("not_suitable");
  const [error, setError] = useState<string | null>(null);

  function onSkip() {
    setError(null);
    startTransition(() => {
      void skipLeadForDetailAction({ leadId, reason }).then((r) => {
        if (r.ok) {
          router.refresh();
        } else {
          setError(r.error);
        }
      });
    });
  }

  return (
    <div className="skip-lead-panel">
      <h3 className="skip-lead-heading">Skip this lead</h3>
      <p className="skip-lead-hint">
        Hides this lead from the Message Queue only. You can restore it from the
        Skipped Leads section on Queues.
      </p>
      <div className="skip-lead-row">
        <label className="skip-lead-label" htmlFor={`skip-reason-${leadId}`}>
          Reason
        </label>
        <select
          id={`skip-reason-${leadId}`}
          className="skip-lead-select"
          value={reason}
          onChange={(e) => setReason(e.target.value as SkipReasonValue)}
          disabled={isPending}
        >
          {SKIP_REASON_VALUES.map((v) => (
            <option key={v} value={v}>
              {skipReasonLabel(v)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="skip-lead-submit"
          onClick={onSkip}
          disabled={isPending}
        >
          {isPending ? "Skipping…" : "Skip this lead"}
        </button>
      </div>
      {error ? <p className="skip-lead-error">{error}</p> : null}
    </div>
  );
}
