import type { Prisma, PrismaClient } from "@prisma/client";
import { malaysiaScheduledAt } from "./formatMalaysiaTime";
import { MESSAGE_STATUS_FIRST_SENT } from "./statusConstants";

/** Second follow-up scheduled at 10:00 MYT, 3 calendar days from today in MYT. */
const SECOND_FOLLOW_UP_DAYS_FROM_TODAY = 3;
const FOLLOW_UP_WORK_HOUR_MYT = 10;

export type MarkFollowUpSentInput = {
  leadId: string;
  which: 1 | 2;
};

/**
 * User manually sent a WhatsApp follow-up and clicked mark in /queues.
 * Does not call any external API — updates local DB only.
 */
export async function markFollowUpSent(
  db: PrismaClient,
  input: MarkFollowUpSentInput,
): Promise<void> {
  const lead = await db.lead.findUnique({
    where: { id: input.leadId },
    select: {
      id: true,
      messageStatus: true,
      followUp1SentAt: true,
      followUp2SentAt: true,
      replyStatus: true,
      handoffRequired: true,
    },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${input.leadId}`);
  }

  if (lead.messageStatus !== MESSAGE_STATUS_FIRST_SENT) {
    throw new Error(
      `Follow-up mark is only for leads with first message sent (current: ${lead.messageStatus ?? "(null)"}).`,
    );
  }

  if (lead.replyStatus === "Replied") {
    throw new Error("This lead is already marked as replied.");
  }

  if (lead.handoffRequired) {
    throw new Error("Handoff leads are handled in Need Human Reply.");
  }

  const now = new Date();

  if (input.which === 1) {
    if (lead.followUp1SentAt) {
      throw new Error("First follow-up was already marked as sent.");
    }

    const nextFollowUpAt = malaysiaScheduledAt(
      SECOND_FOLLOW_UP_DAYS_FROM_TODAY,
      FOLLOW_UP_WORK_HOUR_MYT,
      0,
    );

    const data: Prisma.LeadUpdateInput = {
      followUp1SentAt: now,
      lastMessageSentAt: now,
      lastOutboundMessageAt: now,
      nextFollowUpAt,
    };

    await db.lead.update({ where: { id: input.leadId }, data });
    return;
  }

  if (!lead.followUp1SentAt) {
    throw new Error("Mark first follow-up sent before the second.");
  }

  if (lead.followUp2SentAt) {
    throw new Error("Second follow-up was already marked as sent.");
  }

  const data: Prisma.LeadUpdateInput = {
    followUp2SentAt: now,
    lastMessageSentAt: now,
    lastOutboundMessageAt: now,
    nextFollowUpAt: null,
    nextCheckAt: null,
    nextAction: null,
  };

  await db.lead.update({ where: { id: input.leadId }, data });
}
