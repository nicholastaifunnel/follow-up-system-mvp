"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateLeadReviewAction } from "@/app/leads/[id]/actions";
import { LEAD_REVIEW_REJECTED } from "@/leadReviewStatus";

type Props = {
  leadId: string;
  manualNotes: string | null;
};

export function RejectLeadReviewButton({ leadId, manualNotes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm("Reject this lead from review queue?")) {
      return;
    }

    startTransition(() => {
      void updateLeadReviewAction({
        leadId,
        reviewStatus: LEAD_REVIEW_REJECTED,
        reviewNotes: manualNotes,
      }).then((result) => {
        if (result.ok) {
          router.refresh();
        } else {
          alert(result.error);
        }
      });
    });
  }

  return (
    <button
      type="button"
      className="queue-limit-pill"
      onClick={onClick}
      disabled={isPending}
    >
      {isPending ? "Rejecting..." : "Reject"}
    </button>
  );
}
