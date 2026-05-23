"use client";

import Link from "next/link";
import {
  DEFAULT_FIRST_OUTREACH_BATCH,
  FIRST_OUTREACH_BATCH_OPTIONS,
  type FirstOutreachBatchSize,
} from "@/batchQueueParams";
import { queuesPath } from "@/queuesUrl";

type Props = {
  currentBatch: FirstOutreachBatchSize;
  currentLimit: 10 | 20 | 50;
  currentPhone?: string;
  currentAngle: string;
  reviewMax?: number;
  activityDate?: string;
};

function batchHref(
  batch: FirstOutreachBatchSize,
  limit: 10 | 20 | 50,
  phone: string | undefined,
  angle: string,
  reviewMax: number | undefined,
  activityDate: string | undefined,
): string {
  return queuesPath({
    limit,
    ...(phone?.trim() ? { phone: phone.trim() } : {}),
    angle,
    ...(reviewMax !== undefined ? { reviewMax } : {}),
    ...(activityDate ? { activityDate } : {}),
    ...(batch !== DEFAULT_FIRST_OUTREACH_BATCH ? { batch } : {}),
  });
}

export function BatchSizeSelector({
  currentBatch,
  currentLimit,
  currentPhone,
  currentAngle,
  reviewMax,
  activityDate,
}: Props) {
  return (
    <div className="queue-limit-bar batch-size-bar" role="navigation" aria-label="First outreach batch size">
      <span className="queue-limit-label">First outreach batch:</span>
      {FIRST_OUTREACH_BATCH_OPTIONS.map((n) => (
        <Link
          key={n}
          href={batchHref(n, currentLimit, currentPhone, currentAngle, reviewMax, activityDate)}
          className={
            currentBatch === n ? "queue-limit-pill queue-limit-pill-active" : "queue-limit-pill"
          }
          prefetch={false}
        >
          {n}
        </Link>
      ))}
    </div>
  );
}
