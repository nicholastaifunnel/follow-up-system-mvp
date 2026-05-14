"use client";

import Link from "next/link";

const OPTIONS = [10, 20, 50] as const;

type Props = {
  currentLimit: (typeof OPTIONS)[number];
  /** When set, limit links preserve `phone=` in the URL. */
  currentPhone?: string;
};

function limitHref(limit: number, phone?: string): string {
  const base = `/queues?limit=${limit}`;
  const t = phone?.trim();
  if (!t) return base;
  return `${base}&phone=${encodeURIComponent(t)}`;
}

export function QueueLimitSelector({ currentLimit, currentPhone }: Props) {
  return (
    <div className="queue-limit-bar" role="navigation" aria-label="Rows per section">
      <span className="queue-limit-label">Rows per section:</span>
      {OPTIONS.map((n) => (
        <Link
          key={n}
          href={limitHref(n, currentPhone)}
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
