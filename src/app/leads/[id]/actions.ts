"use server";

import { revalidatePath } from "next/cache";
import { markWhatsAppFirstMessageSent } from "../../../markWhatsAppFirstMessageSent";
import { prisma } from "../../../lib/prisma";
import { prepareLeadMessage } from "../../../prepareLeadMessage";
import {
  recordReplyOutcome,
  SUPPORTED_OUTCOMES,
  type RecordReplyOutcomeInput,
  type ReplyOutcomeKey,
} from "../../../recordReplyOutcome";
import {
  MESSAGE_STATUS_FIRST_SENT,
  MESSAGE_STATUS_PREPARED,
} from "../../../statusConstants";

export type PrepareLeadMessageActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function prepareLeadMessageAction(
  leadId: string,
  language: string = "en",
): Promise<PrepareLeadMessageActionResult> {
  const normalizedLanguage = language === "zh" ? "zh" : "en";

  try {
    await prepareLeadMessage(prisma, {
      leadId,
      language: normalizedLanguage,
    });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/reply-assistant`);
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Prepare failed. Please try again.";
    return { ok: false, error: message };
  }
}

export type MarkLeadAsSentActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function markLeadAsSentAction(
  leadId: string,
): Promise<MarkLeadAsSentActionResult> {
  const snapshot = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      messageStatus: true,
      preparedMessage: true,
      isArchived: true,
    },
  });

  if (!snapshot) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  if (snapshot.isArchived) {
    return {
      ok: false,
      error: "Archived leads cannot be marked as sent.",
    };
  }

  if (snapshot.messageStatus !== MESSAGE_STATUS_PREPARED) {
    return {
      ok: false,
      error: `Mark as Sent is only available when message status is Prepared (current: ${snapshot.messageStatus ?? "(null)"}).`,
    };
  }

  if (!(snapshot.preparedMessage ?? "").trim()) {
    return {
      ok: false,
      error: "Prepare a message with content before marking as sent.",
    };
  }

  try {
    await markWhatsAppFirstMessageSent(prisma, { leadId });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/reply-assistant`);
    revalidatePath("/queues");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Mark as sent failed. Please try again.";
    return { ok: false, error: message };
  }
}

export type RecordReplyOutcomeActionInput = {
  leadId: string;
  outcome: string;
  replyNotes?: string | null;
  /** ISO string from `<input type="datetime-local" />` (optional). */
  nextFollowUpAtISO?: string | null;
};

export type RecordReplyOutcomeActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function recordReplyOutcomeAction(
  input: RecordReplyOutcomeActionInput,
): Promise<RecordReplyOutcomeActionResult> {
  const { leadId, outcome, replyNotes, nextFollowUpAtISO } = input;

  if (!SUPPORTED_OUTCOMES.includes(outcome as ReplyOutcomeKey)) {
    return {
      ok: false,
      error: `Invalid outcome. Expected one of: ${SUPPORTED_OUTCOMES.join(", ")}`,
    };
  }

  const snapshot = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      messageStatus: true,
      isArchived: true,
    },
  });

  if (!snapshot) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  if (snapshot.isArchived) {
    return {
      ok: false,
      error: "Archived leads cannot record a reply outcome.",
    };
  }

  if (snapshot.messageStatus !== MESSAGE_STATUS_FIRST_SENT) {
    return {
      ok: false,
      error: `Reply outcome is only available after the first message is sent (current message status: ${snapshot.messageStatus ?? "(null)"}).`,
    };
  }

  const notes =
    replyNotes === undefined || replyNotes === null
      ? null
      : replyNotes.trim() === ""
        ? null
        : replyNotes.trim();

  const payload: RecordReplyOutcomeInput = {
    leadId,
    outcome: outcome as ReplyOutcomeKey,
    replyNotes: notes,
  };

  if (outcome === "follow-up-later" && nextFollowUpAtISO) {
    const d = new Date(nextFollowUpAtISO);
    if (!Number.isNaN(d.getTime())) {
      payload.nextFollowUpAt = d;
    }
  }

  try {
    await recordReplyOutcome(prisma, payload);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/reply-assistant`);
    revalidatePath("/queues");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Could not save reply outcome. Please try again.";
    return { ok: false, error: message };
  }
}
