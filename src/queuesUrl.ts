/** Shared URL builder for /queues (no Prisma — safe for client components). */

import {
  DEFAULT_FIRST_OUTREACH_BATCH,
  type FirstOutreachBatchSize,
} from "./batchQueueParams";

export type QueuesUrlParams = {
  limit: number;
  phone?: string;
  angle?: string;
  reviewMax?: number;
  /** YYYY-MM-DD in Malaysia time; omitted when default (today MYT). */
  activityDate?: string;
  /** First outreach batch size; omitted when default (10). */
  batch?: FirstOutreachBatchSize;
};

export function buildQueuesSearchString(params: QueuesUrlParams): string {
  const p = new URLSearchParams();
  p.set("limit", String(params.limit));
  const ph = params.phone?.trim();
  if (ph) p.set("phone", ph);
  const ang = params.angle?.trim();
  if (ang && ang !== "all") p.set("angle", ang);
  if (
    params.reviewMax !== undefined &&
    params.reviewMax !== null &&
    Number.isFinite(params.reviewMax)
  ) {
    p.set("reviewMax", String(params.reviewMax));
  }
  const ad = params.activityDate?.trim();
  if (ad && /^\d{4}-\d{2}-\d{2}$/.test(ad)) {
    p.set("activityDate", ad);
  }
  if (
    params.batch !== undefined &&
    params.batch !== DEFAULT_FIRST_OUTREACH_BATCH
  ) {
    p.set("batch", String(params.batch));
  }
  return p.toString();
}

export function queuesPath(params: QueuesUrlParams): string {
  const q = buildQueuesSearchString(params);
  return q ? `/queues?${q}` : "/queues";
}
