"use server";

import { revalidatePath } from "next/cache";
import { markWhatsAppFirstMessageSent } from "../../../markWhatsAppFirstMessageSent";
import { prisma } from "../../../lib/prisma";
import { prepareLeadMessage } from "../../../prepareLeadMessage";
import { MESSAGE_STATUS_PREPARED } from "../../../statusConstants";

export type PrepareLeadMessageActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function prepareLeadMessageAction(
  leadId: string,
): Promise<PrepareLeadMessageActionResult> {
  try {
    await prepareLeadMessage(prisma, { leadId });
    revalidatePath(`/leads/${leadId}`);
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
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Mark as sent failed. Please try again.";
    return { ok: false, error: message };
  }
}
