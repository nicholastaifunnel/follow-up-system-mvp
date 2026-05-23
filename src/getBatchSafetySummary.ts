import type { PrismaClient } from "@prisma/client";
import {
  getMalaysiaTodayIsoDate,
  mytCalendarDayUtcRange,
} from "./formatMalaysiaTime";

export type BatchSafetySummary = {
  sentToday: number;
  suggestedBatch: number;
  nextBatchHint: string;
};

/** Count of first messages sent today (MYT calendar day). */
export async function getTodayFirstMessageSentCount(
  db: PrismaClient,
): Promise<number> {
  const range = mytCalendarDayUtcRange(getMalaysiaTodayIsoDate());
  return db.lead.count({
    where: {
      firstMessageSentAt: {
        gte: range.start,
        lt: range.endExclusive,
      },
    },
  });
}

export async function getBatchSafetySummary(
  db: PrismaClient,
  suggestedBatch: number,
): Promise<BatchSafetySummary> {
  const sentToday = await getTodayFirstMessageSentCount(db);
  return {
    sentToday,
    suggestedBatch,
    nextBatchHint: "After 60–90 minutes",
  };
}
