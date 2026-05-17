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
import { isReviewPlanType } from "../../../reviewPlanConstants";
import type { ReviewFollowUpReason } from "../../../reviewPlanConstants";
import type { ReviewPlanType } from "../../../reviewPlanConstants";
import type { ReviewTrialStatus } from "../../../reviewTrialConstants";
import {
  canStartReviewTrial,
  canStopReviewTrial,
  computePlanEndDate,
  computeReviewPlanDisplayStatus,
  computeReviewFollowUpReason,
  type ReviewPlanLeadFields,
} from "../../../reviewPlanFollowUp";

const reviewPlanLeadSelect = {
  reviewTrialStatus: true,
  reviewTrialStartAt: true,
  reviewTrialEndAt: true,
  reviewPlanType: true,
  reviewTrialCheckInSentAt: true,
  reviewRenewalReminderSentAt: true,
  reviewExpiredReminder1SentAt: true,
  reviewExpiredFollowUp1SentAt: true,
  reviewExpiredFollowUp2SentAt: true,
} as const;

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

export type ReviewTrialSavedSnapshot = {
  planType: string | null;
  startDate: string;
  endDate: string;
  displayStatus: ReviewTrialStatus;
  followUpReason: ReviewFollowUpReason;
};

export type ReviewTrialActionResult =
  | { ok: true; saved?: ReviewTrialSavedSnapshot }
  | { ok: false; error: string };

function formatPlanDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function buildReviewTrialSavedSnapshot(lead: ReviewPlanLeadFields): ReviewTrialSavedSnapshot {
  return {
    planType: lead.reviewPlanType,
    startDate: formatPlanDateInput(lead.reviewTrialStartAt),
    endDate: formatPlanDateInput(lead.reviewTrialEndAt),
    displayStatus: computeReviewPlanDisplayStatus(lead),
    followUpReason: computeReviewFollowUpReason(lead),
  };
}

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
  planType: string | null;
  startDate: string | null;
  endDate: string | null;
  publicUrl: string | null;
  merchantUrl: string | null;
  notes: string | null;
}): Promise<ReviewTrialActionResult> {
  if (input.planType && !isReviewPlanType(input.planType)) {
    return { ok: false, error: "Invalid review plan type." };
  }
  if (!(await ensureLeadExists(input.leadId))) {
    return { ok: false, error: `Lead not found: ${input.leadId}` };
  }

  let startAt = parseDateInput(input.startDate);
  let endAt = parseDateInput(input.endDate);
  if (input.startDate && !startAt) {
    return { ok: false, error: "Invalid plan start date." };
  }
  if (input.endDate && !endAt && !input.planType) {
    return { ok: false, error: "Invalid plan end date." };
  }

  const planType = input.planType && isReviewPlanType(input.planType) ? input.planType : null;
  if (planType) {
    if (!startAt) {
      startAt = todayDateOnlyUtc();
    }
    endAt = computePlanEndDate(startAt, planType);
  }

  await prisma.lead.update({
    where: { id: input.leadId },
    data: {
      reviewPlanType: planType,
      reviewTrialStartAt: startAt,
      reviewTrialEndAt: endAt,
      ...(planType === "Monthly Paid" || planType === "Yearly Paid"
        ? { reviewTrialStatus: null }
        : {}),
      reviewPublicUrl: nullableTrimmed(input.publicUrl),
      reviewMerchantUrl: nullableTrimmed(input.merchantUrl),
      reviewTrialNotes: nullableTrimmed(input.notes),
      reviewTrialUpdatedAt: new Date(),
    },
  });

  const updated = await prisma.lead.findUnique({
    where: { id: input.leadId },
    select: reviewPlanLeadSelect,
  });
  if (!updated) {
    return { ok: false, error: `Lead not found: ${input.leadId}` };
  }

  revalidateReviewTrialPaths(input.leadId);
  return { ok: true, saved: buildReviewTrialSavedSnapshot(updated) };
}

export async function startOneMonthReviewTrialAction(
  leadId: string,
  planTypeInput?: string | null,
): Promise<ReviewTrialActionResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: reviewPlanLeadSelect,
  });
  if (!lead) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  const displayStatus = computeReviewPlanDisplayStatus(lead);
  if (!canStartReviewTrial(displayStatus)) {
    if (displayStatus === "Converted Paid") {
      return {
        ok: false,
        error: "Cannot start a new plan for a converted paid lead.",
      };
    }
    return {
      ok: false,
      error: "An active plan is already in progress.",
    };
  }

  const planType: ReviewPlanType =
    planTypeInput && isReviewPlanType(planTypeInput)
      ? planTypeInput
      : lead.reviewPlanType && isReviewPlanType(lead.reviewPlanType)
        ? lead.reviewPlanType
        : "Free Trial";

  const start = todayDateOnlyUtc();
  const end = computePlanEndDate(start, planType);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      reviewPlanType: planType,
      reviewTrialStatus: planType === "Free Trial" ? "Trial Active" : null,
      reviewTrialStartAt: start,
      reviewTrialEndAt: end,
      reviewTrialUpdatedAt: new Date(),
    },
  });

  const updated = await prisma.lead.findUnique({
    where: { id: leadId },
    select: reviewPlanLeadSelect,
  });
  if (!updated) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  revalidateReviewTrialPaths(leadId);
  return { ok: true, saved: buildReviewTrialSavedSnapshot(updated) };
}

export async function stopReviewTrialAction(
  leadId: string,
): Promise<ReviewTrialActionResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: reviewPlanLeadSelect,
  });
  if (!lead) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  const displayStatus = computeReviewPlanDisplayStatus(lead);
  if (!canStopReviewTrial(displayStatus)) {
    return {
      ok: false,
      error: "Stop Plan is only available for an active or expiring plan.",
    };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      reviewTrialStatus: "Stopped",
      reviewTrialUpdatedAt: new Date(),
    },
  });

  const updated = await prisma.lead.findUnique({
    where: { id: leadId },
    select: reviewPlanLeadSelect,
  });
  if (!updated) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  revalidateReviewTrialPaths(leadId);
  return { ok: true, saved: buildReviewTrialSavedSnapshot(updated) };
}

type ReviewFollowUpMarkField =
  | "reviewTrialCheckInSentAt"
  | "reviewRenewalReminderSentAt"
  | "reviewExpiredReminder1SentAt"
  | "reviewExpiredFollowUp1SentAt"
  | "reviewExpiredFollowUp2SentAt";

async function markReviewFollowUpSent(
  leadId: string,
  field: ReviewFollowUpMarkField,
): Promise<ReviewTrialActionResult> {
  if (!(await ensureLeadExists(leadId))) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      [field]: new Date(),
      reviewTrialUpdatedAt: new Date(),
    },
  });
  revalidateReviewTrialPaths(leadId);
  return { ok: true };
}

export async function markReviewTrialCheckInSentAction(
  leadId: string,
): Promise<ReviewTrialActionResult> {
  return markReviewFollowUpSent(leadId, "reviewTrialCheckInSentAt");
}

export async function markReviewRenewalReminderSentAction(
  leadId: string,
): Promise<ReviewTrialActionResult> {
  return markReviewFollowUpSent(leadId, "reviewRenewalReminderSentAt");
}

export async function markReviewExpiredReminder1SentAction(
  leadId: string,
): Promise<ReviewTrialActionResult> {
  return markReviewFollowUpSent(leadId, "reviewExpiredReminder1SentAt");
}

export async function markReviewExpiredFollowUp1SentAction(
  leadId: string,
): Promise<ReviewTrialActionResult> {
  return markReviewFollowUpSent(leadId, "reviewExpiredFollowUp1SentAt");
}

export async function markReviewExpiredFollowUp2SentAction(
  leadId: string,
): Promise<ReviewTrialActionResult> {
  return markReviewFollowUpSent(leadId, "reviewExpiredFollowUp2SentAt");
}
