"use server";

import { revalidatePath } from "next/cache";
import { markFollowUpSent } from "@/markFollowUpSent";
import { prisma } from "@/lib/prisma";
import { MESSAGE_STATUS_FIRST_SENT } from "@/statusConstants";
import { isDoNotContactLead } from "@/doNotContact";

export type MarkFollowUpSentActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function markFirstFollowUpSentAction(
  leadId: string,
): Promise<MarkFollowUpSentActionResult> {
  const snapshot = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      messageStatus: true,
      followUp1SentAt: true,
      replyStatus: true,
      handoffRequired: true,
      isArchived: true,
      archivedReason: true,
      skippedAt: true,
      replyOutcome: true,
      contactStatus: true,
    },
  });

  if (!snapshot) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  if (snapshot.isArchived) {
    return { ok: false, error: "Archived leads cannot be updated." };
  }

  if (isDoNotContactLead(snapshot)) {
    return { ok: false, error: "Do Not Contact leads cannot be updated." };
  }

  if (snapshot.skippedAt) {
    return { ok: false, error: "Skipped leads cannot be updated. Restore from Queues first." };
  }

  if (snapshot.messageStatus !== MESSAGE_STATUS_FIRST_SENT) {
    return {
      ok: false,
      error: "First follow-up is only for leads with first message sent.",
    };
  }

  if (snapshot.replyStatus === "Replied") {
    return { ok: false, error: "This lead is already marked as replied." };
  }

  if (snapshot.handoffRequired) {
    return { ok: false, error: "Use Need Human Reply for handoff leads." };
  }

  if (snapshot.followUp1SentAt) {
    return { ok: false, error: "First follow-up was already marked as sent." };
  }

  try {
    await markFollowUpSent(prisma, { leadId, which: 1 });
    revalidatePath("/queues");
    revalidatePath(`/leads/${leadId}`);
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not mark first follow-up sent.";
    return { ok: false, error: message };
  }
}

export async function markSecondFollowUpSentAction(
  leadId: string,
): Promise<MarkFollowUpSentActionResult> {
  const snapshot = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      messageStatus: true,
      followUp1SentAt: true,
      followUp2SentAt: true,
      replyStatus: true,
      handoffRequired: true,
      isArchived: true,
      archivedReason: true,
      skippedAt: true,
      replyOutcome: true,
      contactStatus: true,
    },
  });

  if (!snapshot) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  if (snapshot.isArchived) {
    return { ok: false, error: "Archived leads cannot be updated." };
  }

  if (isDoNotContactLead(snapshot)) {
    return { ok: false, error: "Do Not Contact leads cannot be updated." };
  }

  if (snapshot.skippedAt) {
    return { ok: false, error: "Skipped leads cannot be updated. Restore from Queues first." };
  }

  if (snapshot.messageStatus !== MESSAGE_STATUS_FIRST_SENT) {
    return {
      ok: false,
      error: "Second follow-up is only for leads with first message sent.",
    };
  }

  if (snapshot.replyStatus === "Replied") {
    return { ok: false, error: "This lead is already marked as replied." };
  }

  if (snapshot.handoffRequired) {
    return { ok: false, error: "Use Need Human Reply for handoff leads." };
  }

  if (!snapshot.followUp1SentAt) {
    return { ok: false, error: "Mark first follow-up sent before the second." };
  }

  if (snapshot.followUp2SentAt) {
    return { ok: false, error: "Second follow-up was already marked as sent." };
  }

  try {
    await markFollowUpSent(prisma, { leadId, which: 2 });
    revalidatePath("/queues");
    revalidatePath(`/leads/${leadId}`);
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not mark second follow-up sent.";
    return { ok: false, error: message };
  }
}
