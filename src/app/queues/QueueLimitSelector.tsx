"use client";

import Link from "next/link";
import { queuesPath } from "@/queuesUrl";

const OPTIONS = [10, 20, 50] as const;

type Props = {
  currentLimit: (typeof OPTIONS)[number];
  /** When set, limit links preserve `phone=` in the URL. */
  currentPhone?: string;
  currentAngle: string;
  reviewMax?: number;
};

function limitHref(
  limit: number,
  phone: string | undefined,
  angle: string,
  reviewMax: number | undefined,
): string {
  return queuesPath({
    limit,
    ...(phone?.trim() ? { phone: phone.trim() } : {}),
    angle,
    ...(reviewMax !== undefined ? { reviewMax } : {}),
  });
}

export function QueueLimitSelector({
  currentLimit,
  currentPhone,
  currentAngle,
  reviewMax,
}: Props) {
  return (
    <div className="queue-limit-bar" role="navigation" aria-label="Rows per section">
      <span className="queue-limit-label">Rows per section:</span>
      {OPTIONS.map((n) => (
        <Link
          key={n}
          href={limitHref(n, currentPhone, currentAngle, reviewMax)}
          className={
            currentLimit === n ? "queue-limit-pill queue-limit-pill-active" : "queue-limit-pill"
          }
          prefetch={false}
        >
          {n}
        </Link>
      ))}
    </div>
  );
}
