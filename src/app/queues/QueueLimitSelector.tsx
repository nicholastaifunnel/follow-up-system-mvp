"use client";

import Link from "next/link";

const OPTIONS = [10, 20, 50] as const;

type Props = {
  currentLimit: (typeof OPTIONS)[number];
};

export function QueueLimitSelector({ currentLimit }: Props) {
  return (
    <div className="queue-limit-bar" role="navigation" aria-label="Rows per section">
      <span className="queue-limit-label">Rows per section:</span>
      {OPTIONS.map((n) => (
        <Link
          key={n}
          href={`/queues?limit=${n}`}
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
