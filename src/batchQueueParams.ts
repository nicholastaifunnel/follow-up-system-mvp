/** First cold-outreach batch size for Prepare / Send sections only. */

export const FIRST_OUTREACH_BATCH_OPTIONS = [5, 10, 15] as const;

export type FirstOutreachBatchSize = (typeof FIRST_OUTREACH_BATCH_OPTIONS)[number];

export const DEFAULT_FIRST_OUTREACH_BATCH: FirstOutreachBatchSize = 10;

export function parseFirstOutreachBatchParam(
  raw: string | string[] | undefined,
): FirstOutreachBatchSize {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === "") return DEFAULT_FIRST_OUTREACH_BATCH;
  const n = Number.parseInt(String(v), 10);
  if (n === 5 || n === 10 || n === 15) return n;
  return DEFAULT_FIRST_OUTREACH_BATCH;
}

export function isFirstOutreachActionKey(
  key: string,
): key is "prepareFirstMessage" | "sendPreparedMessage" {
  return key === "prepareFirstMessage" || key === "sendPreparedMessage";
}
