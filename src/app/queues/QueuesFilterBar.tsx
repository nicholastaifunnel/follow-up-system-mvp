"use client";

import Link from "next/link";
import type { QueueAngleParam } from "@/queueListFilter";
import { queuesPath } from "@/queuesUrl";

const ANGLE_OPTIONS: { value: QueueAngleParam; label: string }[] = [
  { value: "all", label: "All leads" },
  { value: "no-website", label: "No Website" },
  { value: "low-review", label: "Low Review" },
  { value: "has-website", label: "Has Website" },
  { value: "has-phone", label: "Has Phone" },
  { value: "no-phone", label: "No Phone" },
];

const REVIEW_MAX_OPTIONS = [5, 10, 20] as const;

type Props = {
  limit: 10 | 20 | 50;
  phone: string;
  angle: QueueAngleParam;
  reviewMax?: number;
};

export function QueuesFilterBar({ limit, phone, angle, reviewMax }: Props) {
  const phoneTrim = phone.trim();
  const base = {
    limit,
    ...(phoneTrim ? { phone: phoneTrim } : {}),
  };

  return (
    <div className="queues-filter-bar" role="navigation" aria-label="Queue filters">
      <div className="queues-filter-row">
        <span className="queues-filter-label">Angle</span>
        <div className="queues-filter-pills">
          {ANGLE_OPTIONS.map(({ value, label }) => {
            const href = queuesPath({
              ...base,
              angle: value,
              ...(reviewMax !== undefined ? { reviewMax } : {}),
            });
            const active = angle === value;
            return (
              <Link
                key={value}
                href={href}
                className={
                  active ? "queue-filter-pill queue-filter-pill-active" : "queue-filter-pill"
                }
                prefetch={false}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="queues-filter-row">
        <span className="queues-filter-label">Max reviews</span>
        <div className="queues-filter-pills">
          <Link
            href={queuesPath({ ...base, angle })}
            className={
              reviewMax === undefined
                ? "queue-filter-pill queue-filter-pill-active"
                : "queue-filter-pill"
            }
            prefetch={false}
          >
            Any
          </Link>
          {REVIEW_MAX_OPTIONS.map((n) => {
            const href = queuesPath({ ...base, angle, reviewMax: n });
            const active = reviewMax === n;
            return (
              <Link
                key={n}
                href={href}
                className={
                  active ? "queue-filter-pill queue-filter-pill-active" : "queue-filter-pill"
                }
                prefetch={false}
              >
                ≤{n}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
