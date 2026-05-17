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
import { isSkipReasonValue } from "../../../skipLeadReasons";
import {
  isReviewTrialStatus,
  type ReviewTrialStatus,
} from "../../../reviewTrialConstants";

export type PrepareLeadMessageActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type UpdatePreparedMessageDraftActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updatePreparedMessageDraftAction(
  leadId: string,
  body: string,
): Promise<UpdatePreparedMessageDraftActionResult> {
  if (body.trim().length === 0) {
    return { ok: false, error: "Draft cannot be empty." };
  }

  const snapshot = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      isArchived: true,
      skippedAt: true,
      messageStatus: true,
    },
  });

  if (!snapshot) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  if (snapshot.isArchived) {
    return { ok: false, error: "Archived leads cannot be edited." };
  }

  if (snapshot.skippedAt) {
    return {
      ok: false,
      error: "Skipped leads cannot be edited. Restore from Queues first.",
    };
  }

  if (snapshot.messageStatus !== MESSAGE_STATUS_PREPARED) {
    return {
      ok: false,
      error: `Draft editing is only available when message status is Prepared (current: ${snapshot.messageStatus ?? "(null)"}).`,
    };
  }

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { preparedMessage: body },
    });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/reply-assistant`);
    revalidatePath("/queues");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Failed to save draft. Please try again.";
    return { ok: false, error: message };
  }
}

export async function prepareLeadMessageAction(
  leadId: string,
): Promise<PrepareLeadMessageActionResult> {
  const snap = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { skippedAt: true },
  });
  if (snap?.skippedAt) {
    return {
      ok: false,
      error:
        "This lead is skipped from the Message Queue. Restore it on the Queues page before preparing.",
    };
  }

  try {
    await prepareLeadMessage(prisma, { leadId });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/reply-assistant`);
    revalidatePath("/queues");
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
      skippedAt: true,
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

  if (snapshot.skippedAt) {
    return {
      ok: false,
      error: "Skipped leads cannot be marked as sent. Restore from Queues first.",
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

export type SkipLeadActionResult = { ok: true } | { ok: false; error: string };

export async function skipLeadForDetailAction(input: {
  leadId: string;
  reason: string;
}): Promise<SkipLeadActionResult> {
  const { leadId, reason } = input;
  if (!isSkipReasonValue(reason)) {
    return { ok: false, error: "Invalid skip reason." };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { isArchived: true, skippedAt: true },
  });

  if (!lead) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }
  if (lead.isArchived) {
    return { ok: false, error: "Archived leads cannot be skipped." };
  }
  if (lead.skippedAt) {
    return { ok: false, error: "This lead is already skipped." };
  }

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        skippedAt: new Date(),
        skipReason: reason,
      },
    });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/reply-assistant`);
    revalidatePath("/queues");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not skip lead. Please try again.";
    return { ok: false, error: message };
  }
}

export type RestoreLeadActionResult = { ok: true } | { ok: false; error: string };

export async function restoreLeadAction(
  leadId: string,
): Promise<RestoreLeadActionResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { skippedAt: true },
  });

  if (!lead) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }
  if (!lead.skippedAt) {
    return { ok: false, error: "This lead is not skipped." };
  }

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        skippedAt: null,
        skipReason: null,
      },
    });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/reply-assistant`);
    revalidatePath("/queues");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not restore lead. Please try again.";
    return { ok: false, error: message };
  }
}

export type ReviewTrialActionResult =
  | { ok: true }
  | { ok: false; error: string };

function nullableTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function parseDateInput(value: string | null | undefined): Date | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function todayDateOnlyUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

async function ensureLeadExists(leadId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });
  return lead !== null;
}

function revalidateReviewTrialPaths(leadId: string): void {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/review-trials");
  revalidatePath("/queues");
}

export async function updateReviewTrialAction(input: {
  leadId: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  publicUrl: string | null;
  merchantUrl: string | null;
  notes: string | null;
}): Promise<ReviewTrialActionResult> {
  if (!isReviewTrialStatus(input.status)) {
    return { ok: false, error: "Invalid review trial status." };
  }
  if (!(await ensureLeadExists(input.leadId))) {
    return { ok: false, error: `Lead not found: ${input.leadId}` };
  }

  const startAt = parseDateInput(input.startDate);
  const endAt = parseDateInput(input.endDate);
  if (input.startDate && !startAt) {
    return { ok: false, error: "Invalid trial start date." };
  }
  if (input.endDate && !endAt) {
    return { ok: false, error: "Invalid trial end date." };
  }

  await prisma.lead.update({
    where: { id: input.leadId },
    data: {
      reviewTrialStatus: input.status as ReviewTrialStatus,
      reviewTrialStartAt: startAt,
      reviewTrialEndAt: endAt,
      reviewPublicUrl: nullableTrimmed(input.publicUrl),
      reviewMerchantUrl: nullableTrimmed(input.merchantUrl),
      reviewTrialNotes: nullableTrimmed(input.notes),
      reviewTrialUpdatedAt: new Date(),
    },
  });
  revalidateReviewTrialPaths(input.leadId);
  return { ok: true };
}

export async function startOneMonthReviewTrialAction(
  leadId: string,
): Promise<ReviewTrialActionResult> {
  if (!(await ensureLeadExists(leadId))) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  const start = todayDateOnlyUtc();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      reviewTrialStatus: "Trial Active",
      reviewTrialStartAt: start,
      reviewTrialEndAt: end,
      reviewTrialUpdatedAt: new Date(),
    },
  });
  revalidateReviewTrialPaths(leadId);
  return { ok: true };
}

export async function clearReviewTrialAction(
  leadId: string,
): Promise<ReviewTrialActionResult> {
  if (!(await ensureLeadExists(leadId))) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      reviewTrialStatus: null,
      reviewTrialStartAt: null,
      reviewTrialEndAt: null,
      reviewPublicUrl: null,
      reviewMerchantUrl: null,
      reviewTrialNotes: null,
      reviewTrialUpdatedAt: null,
    },
  });
  revalidateReviewTrialPaths(leadId);
  return { ok: true };
}
