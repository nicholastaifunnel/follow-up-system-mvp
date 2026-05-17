import type { Prisma, PrismaClient } from "@prisma/client";
import { malaysiaScheduledAt } from "./formatMalaysiaTime";
import {
  BOT_STATUS_NOT_CONNECTED,
  CONTACT_STATUS_CONTACTED,
  MESSAGE_STATUS_FIRST_SENT,
  REPLY_STATUS_WAITING,
} from "./statusConstants";

export type MarkWhatsAppFirstMessageSentInput = {
  leadId: string;
  /** Optional: store what was sent when user marks sent (manual paste/snippet). */
  lastOutboundMessage?: string | null;
  /** Overrides campaign/default scheduling when set. */
  nextCheckAt?: Date;
  nextFollowUpAt?: Date;
};

/** Mark sent: next check tomorrow 10:00 MYT; next follow-up 2 days later 10:00 MYT. */
const MARK_SENT_NEXT_CHECK_DAYS = 1;
const MARK_SENT_NEXT_FOLLOW_UP_DAYS = 2;
const MARK_SENT_WORK_HOUR_MYT = 10;

/**
 * User manually sent the first WhatsApp and clicked "Mark as Sent".
 * Does not call any WhatsApp API, webhooks, or AI — updates local DB only.
 */
export async function markWhatsAppFirstMessageSent(
  db: PrismaClient,
  input: MarkWhatsAppFirstMessageSentInput,
): Promise<void> {
  const lead = await db.lead.findUnique({
    where: { id: input.leadId },
    include: { campaign: true },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${input.leadId}`);
  }

  const now = new Date();

  const nextCheckAt =
    input.nextCheckAt ??
    malaysiaScheduledAt(MARK_SENT_NEXT_CHECK_DAYS, MARK_SENT_WORK_HOUR_MYT, 0);
  const nextFollowUpAt =
    input.nextFollowUpAt ??
    malaysiaScheduledAt(MARK_SENT_NEXT_FOLLOW_UP_DAYS, MARK_SENT_WORK_HOUR_MYT, 0);

  const data: Prisma.LeadUpdateInput = {
    messageStatus: MESSAGE_STATUS_FIRST_SENT,
    replyStatus: REPLY_STATUS_WAITING,
    botStatus: BOT_STATUS_NOT_CONNECTED,
    contactStatus: CONTACT_STATUS_CONTACTED,
    firstMessageSentAt: lead.firstMessageSentAt ?? now,
    lastMessageSentAt: now,
    lastOutboundMessageAt: now,
    nextCheckAt,
    nextFollowUpAt,
  };

  if (input.lastOutboundMessage !== undefined) {
    data.lastOutboundMessage =
      input.lastOutboundMessage === null || input.lastOutboundMessage === ""
        ? null
        : input.lastOutboundMessage;
  }

  await db.lead.update({
    where: { id: input.leadId },
    data,
  });
}
