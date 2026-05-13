import type { Prisma, PrismaClient } from "@prisma/client";
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

const FALLBACK_REPLY_CHECK_HOURS = 24;
const FALLBACK_FOLLOW_UP_DAYS = 3;

function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

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
  const replyCheckHours =
    lead.campaign?.defaultReplyCheckHours ?? FALLBACK_REPLY_CHECK_HOURS;
  const followUpDays =
    lead.campaign?.defaultFollowUpDays ?? FALLBACK_FOLLOW_UP_DAYS;

  const nextCheckAt =
    input.nextCheckAt ?? addHours(now, replyCheckHours);
  const nextFollowUpAt =
    input.nextFollowUpAt ?? addDays(now, followUpDays);

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
