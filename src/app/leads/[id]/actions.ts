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
  getDefaultPlanAmountCents,
  isReviewPlanType,
  REVIEW_FOLLOW_UP_DRAFT_FIELDS,
  REVIEW_FOLLOW_UP_SENT_FIELDS,
  type ReviewFollowUpActionKey,
  type ReviewFollowUpReason,
  type ReviewPlanType,
} from "../../../reviewPlanConstants";
import { parseRmToCents } from "../../../money";
import {
  buildReviewFollowUpMessage,
  isReviewFollowUpActionKey,
} from "../../../reviewFollowUpMessages";
import type { ReviewTrialStatus } from "../../../reviewTrialConstants";
import {
  canStartReviewTrial,
  canStopReviewTrial,
  computePlanEndDate,
  computeReviewPlanDisplayStatus,
  computeReviewFollowUpReason,
  type ReviewPlanLeadFields,
} from "../../../reviewPlanFollowUp";
import {
  canEnterFirstOutreach,
  isLeadReviewStatus,
} from "../../../leadReviewStatus";
import { parseMalaysiaDateTimeLocal } from "../../../formatMalaysiaTime";
import {
  getDoNotContactAction,
  isDoNotContactActionKey,
  isDoNotContactLead,
  type DoNotContactActionKey,
} from "../../../doNotContact";

const reviewPlanLeadSelect = {
  reviewTrialStatus: true,
  reviewTrialStartAt: true,
  reviewTrialEndAt: true,
  reviewPlanType: true,
  reviewPlanAmountCents: true,
  reviewPlanCurrency: true,
  reviewTrialCheckInSentAt: true,
  reviewRenewalReminderSentAt: true,
  reviewExpiredReminder1SentAt: true,
  reviewExpiredFollowUp1SentAt: true,
  reviewExpiredFollowUp2SentAt: true,
  reviewTrialCheckInDraft: true,
  reviewRenewalReminderDraft: true,
  reviewExpiredReminder1Draft: true,
  reviewExpiredFollowUp1Draft: true,
  reviewExpiredFollowUp2Draft: true,
} as const;

const CLEAR_REVIEW_FOLLOW_UP_TRACKING_DATA = {
  reviewTrialCheckInDraft: null,
  reviewRenewalReminderDraft: null,
  reviewExpiredReminder1Draft: null,
  reviewExpiredFollowUp1Draft: null,
  reviewExpiredFollowUp2Draft: null,
  reviewTrialCheckInSentAt: null,
  reviewRenewalReminderSentAt: null,
  reviewExpiredReminder1SentAt: null,
  reviewExpiredFollowUp1SentAt: null,
  reviewExpiredFollowUp2SentAt: null,
} as const;

export type PrepareLeadMessageActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type UpdatePreparedMessageDraftActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type UpdateWhatsAppPhoneActionResult =
  | { ok: true; whatsappPhone: string | null }
  | { ok: false; error: string };

export type UpdateLeadReviewActionResult =
  | { ok: true; outreachReadiness: string; manualNotes: string | null }
  | { ok: false; error: string };

export type MarkDoNotContactActionResult =
  | { ok: true }
  | { ok: false; error: string };

function appendStopNote(
  current: string | null | undefined,
  label: string,
  note: string | null | undefined,
): string | null {
  const existing = current?.trim() ?? "";
  const cleanNote = note?.trim() ?? "";
  if (!cleanNote) return existing || null;

  const date = new Date().toISOString().slice(0, 10);
  const entry = `[${date} ${label}] ${cleanNote}`;
  return existing ? `${existing}\n${entry}` : entry;
}

export async function markDoNotContactAction(input: {
  leadId: string;
  reason: string;
  note?: string | null;
}): Promise<MarkDoNotContactActionResult> {
  if (!isDoNotContactActionKey(input.reason)) {
    return { ok: false, error: "Invalid stop reason." };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    select: {
      id: true,
      manualNotes: true,
    },
  });

  if (!lead) {
    return { ok: false, error: `Lead not found: ${input.leadId}` };
  }

  const reason = getDoNotContactAction(input.reason as DoNotContactActionKey);
  const now = new Date();

  try {
    await prisma.lead.update({
      where: { id: input.leadId },
      data: {
        replyStatus: "Stopped",
        replyOutcome: reason.replyOutcome,
        messageStatus: "Stopped",
        contactStatus: reason.contactStatus,
        leadTemperature: "Cold",
        handoffRequired: false,
        handoffReason: null,
        nextAction: null,
        nextCheckAt: null,
        nextFollowUpAt: null,
        isArchived: true,
        archivedAt: now,
        archivedReason: reason.archivedReason,
        manualNotes: appendStopNote(lead.manualNotes, reason.label, input.note),
      },
    });
    revalidatePath(`/leads/${input.leadId}`);
    revalidatePath(`/leads/${input.leadId}/reply-assistant`);
    revalidatePath("/queues");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Failed to mark this lead as do not contact.";
    return { ok: false, error: message };
  }
}

export async function updateLeadReviewAction(input: {
  leadId: string;
  reviewStatus: string;
  reviewNotes?: string | null;
}): Promise<UpdateLeadReviewActionResult> {
  const status = input.reviewStatus.trim();
  if (!isLeadReviewStatus(status)) {
    return { ok: false, error: "Invalid lead review status." };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    select: { id: true },
  });

  if (!lead) {
    return { ok: false, error: `Lead not found: ${input.leadId}` };
  }

  const notes = nullableTrimmed(input.reviewNotes);

  try {
    const updated = await prisma.lead.update({
      where: { id: input.leadId },
      data: {
        outreachReadiness: status,
        manualNotes: notes,
      },
      select: {
        outreachReadiness: true,
        manualNotes: true,
      },
    });
    revalidatePath(`/leads/${input.leadId}`);
    revalidatePath("/queues");
    return {
      ok: true,
      outreachReadiness: updated.outreachReadiness ?? status,
      manualNotes: updated.manualNotes,
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Failed to save lead review. Please try again.";
    return { ok: false, error: message };
  }
}

export async function updateWhatsAppPhoneAction(
  leadId: string,
  whatsappPhone: string,
): Promise<UpdateWhatsAppPhoneActionResult> {
  const trimmed = whatsappPhone.trim();
  const normalized = trimmed === "" ? null : trimmed;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });

  if (!lead) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  try {
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { whatsappPhone: normalized },
      select: { whatsappPhone: true },
    });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads/${leadId}/reply-assistant`);
    revalidatePath("/queues");
    return { ok: true, whatsappPhone: updated.whatsappPhone };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Failed to save WhatsApp phone. Please try again.";
    return { ok: false, error: message };
  }
}

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
      archivedReason: true,
      skippedAt: true,
      messageStatus: true,
      replyStatus: true,
      replyOutcome: true,
      contactStatus: true,
    },
  });

  if (!snapshot) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  if (snapshot.isArchived) {
    return { ok: false, error: "Archived leads cannot be edited." };
  }

  if (isDoNotContactLead(snapshot)) {
    return { ok: false, error: "Do Not Contact leads cannot be edited." };
  }

  if (snapshot.skippedAt) {
    return {
      ok: false,
      error: "Skipped leads cannot be edited. Restore from Queues first.",
    };
  }

  if (
    snapshot.messageStatus !== MESSAGE_STATUS_PREPARED &&
    snapshot.messageStatus !== MESSAGE_STATUS_FIRST_SENT
  ) {
    return {
      ok: false,
      error: `Draft editing is only available when a message draft exists (current: ${snapshot.messageStatus ?? "(null)"}).`,
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
  messageStage?: string,
): Promise<PrepareLeadMessageActionResult> {
  const requestedStage = messageStage ?? "First Message";
  const snap = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      skippedAt: true,
      outreachReadiness: true,
      isArchived: true,
      archivedReason: true,
      messageStatus: true,
      replyStatus: true,
      replyOutcome: true,
      contactStatus: true,
    },
  });
  if (!snap) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }
  if (snap?.skippedAt) {
    return {
      ok: false,
      error:
        "This lead is skipped from the Message Queue. Restore it on the Queues page before preparing.",
    };
  }
  if (isDoNotContactLead(snap)) {
    return {
      ok: false,
      error: "Do Not Contact — this lead is blocked from outreach.",
    };
  }
  if (
    requestedStage === "First Message" &&
    !canEnterFirstOutreach(snap?.outreachReadiness)
  ) {
    return {
      ok: false,
      error: "Approve this lead before preparing outreach.",
    };
  }

  try {
    await prepareLeadMessage(prisma, {
      leadId,
      ...(messageStage ? { messageStage } : {}),
    });
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
      archivedReason: true,
      skippedAt: true,
      replyStatus: true,
      replyOutcome: true,
      contactStatus: true,
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

  if (isDoNotContactLead(snapshot)) {
    return {
      ok: false,
      error: "Do Not Contact leads cannot be marked as sent.",
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
    revalidatePath("/agent-leads");
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
    const d = parseMalaysiaDateTimeLocal(nextFollowUpAtISO);
    if (!d) {
      return {
        ok: false,
        error: "Invalid follow-up date/time. Please choose a Malaysia time.",
      };
    }
    payload.nextFollowUpAt = d;
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
    revalidatePath("/agent-leads");
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
  amountCents: number | null;
  currency: string;
  displayStatus: ReviewTrialStatus;
  followUpReason: ReviewFollowUpReason;
  checkInDraft: string | null;
  renewalDraft: string | null;
  expiredReminder1Draft: string | null;
  expiredFollowUp1Draft: string | null;
  expiredFollowUp2Draft: string | null;
  checkInSentAt: string | null;
  renewalReminderSentAt: string | null;
  expiredReminder1SentAt: string | null;
  expiredFollowUp1SentAt: string | null;
  expiredFollowUp2SentAt: string | null;
};

export type ReviewTrialActionResult =
  | { ok: true; saved?: ReviewTrialSavedSnapshot }
  | { ok: false; error: string };

function formatPlanDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

type ReviewPlanLeadSnapshotRow = ReviewPlanLeadFields & {
  reviewPlanAmountCents?: number | null;
  reviewPlanCurrency?: string | null;
  reviewTrialCheckInDraft?: string | null;
  reviewRenewalReminderDraft?: string | null;
  reviewExpiredReminder1Draft?: string | null;
  reviewExpiredFollowUp1Draft?: string | null;
  reviewExpiredFollowUp2Draft?: string | null;
};

function buildReviewTrialSavedSnapshot(
  lead: ReviewPlanLeadSnapshotRow,
): ReviewTrialSavedSnapshot {
  return {
    planType: lead.reviewPlanType,
    startDate: formatPlanDateInput(lead.reviewTrialStartAt),
    endDate: formatPlanDateInput(lead.reviewTrialEndAt),
    amountCents: lead.reviewPlanAmountCents ?? null,
    currency: lead.reviewPlanCurrency ?? "MYR",
    displayStatus: computeReviewPlanDisplayStatus(lead),
    followUpReason: computeReviewFollowUpReason(lead),
    checkInDraft: lead.reviewTrialCheckInDraft ?? null,
    renewalDraft: lead.reviewRenewalReminderDraft ?? null,
    expiredReminder1Draft: lead.reviewExpiredReminder1Draft ?? null,
    expiredFollowUp1Draft: lead.reviewExpiredFollowUp1Draft ?? null,
    expiredFollowUp2Draft: lead.reviewExpiredFollowUp2Draft ?? null,
    checkInSentAt: lead.reviewTrialCheckInSentAt?.toISOString() ?? null,
    renewalReminderSentAt: lead.reviewRenewalReminderSentAt?.toISOString() ?? null,
    expiredReminder1SentAt: lead.reviewExpiredReminder1SentAt?.toISOString() ?? null,
    expiredFollowUp1SentAt: lead.reviewExpiredFollowUp1SentAt?.toISOString() ?? null,
    expiredFollowUp2SentAt: lead.reviewExpiredFollowUp2SentAt?.toISOString() ?? null,
  };
}

function parsePlanPriceInput(
  planPrice: string | null | undefined,
  planType: ReviewPlanType | null,
): { ok: true; cents: number | null; currency: string } | { ok: false; error: string } {
  const parsed = parseRmToCents(planPrice ?? "");
  if (!parsed.ok) {
    return parsed;
  }

  if (parsed.cents === null && planType) {
    return { ok: true, cents: getDefaultPlanAmountCents(planType), currency: "MYR" };
  }

  return { ok: true, cents: parsed.cents, currency: "MYR" };
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
  planPrice: string | null;
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
  const priceResult = parsePlanPriceInput(input.planPrice, planType);
  if (!priceResult.ok) {
    return { ok: false, error: priceResult.error };
  }

  if (planType) {
    if (!startAt) {
      startAt = todayDateOnlyUtc();
    }
    endAt = computePlanEndDate(startAt, planType);
  }

  const leadData = {
    reviewPlanType: planType,
    reviewTrialStartAt: startAt,
    reviewTrialEndAt: endAt,
    reviewPlanAmountCents: priceResult.cents,
    reviewPlanCurrency: priceResult.currency,
    ...(planType === "Monthly Paid" || planType === "Yearly Paid"
      ? { reviewTrialStatus: null }
      : {}),
    reviewPublicUrl: nullableTrimmed(input.publicUrl),
    reviewMerchantUrl: nullableTrimmed(input.merchantUrl),
    reviewTrialNotes: nullableTrimmed(input.notes),
    reviewTrialUpdatedAt: new Date(),
  };

  const activePeriodUpdate =
    planType && startAt && endAt
      ? {
          planType,
          startAt,
          endAt,
          priceCents: priceResult.cents,
          amountCents: priceResult.cents,
          currency: priceResult.currency,
          notes: nullableTrimmed(input.notes),
        }
      : null;

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: input.leadId },
      data: leadData,
    }),
    ...(activePeriodUpdate
      ? [
          prisma.reviewPlanPeriod.updateMany({
            where: { leadId: input.leadId, status: "Active" },
            data: activePeriodUpdate,
          }),
        ]
      : []),
  ]);

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
  planPriceInput?: string | null,
  isRenew = false,
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

  const priceResult = parsePlanPriceInput(
    planPriceInput ?? "",
    planType,
  );
  if (!priceResult.ok) {
    return { ok: false, error: priceResult.error };
  }

  const amountCents =
    priceResult.cents ??
    lead.reviewPlanAmountCents ??
    getDefaultPlanAmountCents(planType);
  const currency = lead.reviewPlanCurrency ?? "MYR";

  const periodSource = isRenew ? "Renew Plan" : "Start Plan";

  await prisma.$transaction([
    prisma.reviewPlanPeriod.updateMany({
      where: { leadId, status: "Active" },
      data: { status: "Replaced" },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: {
        reviewPlanType: planType,
        reviewTrialStatus: planType === "Free Trial" ? "Trial Active" : null,
        reviewTrialStartAt: start,
        reviewTrialEndAt: end,
        reviewPlanAmountCents: amountCents,
        reviewPlanCurrency: currency,
        reviewTrialUpdatedAt: new Date(),
        ...CLEAR_REVIEW_FOLLOW_UP_TRACKING_DATA,
      },
    }),
    prisma.reviewPlanPeriod.create({
      data: {
        leadId,
        planType,
        startAt: start,
        endAt: end,
        priceCents: amountCents,
        amountCents,
        currency,
        status: "Active",
        source: periodSource,
      },
    }),
  ]);

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

  await prisma.$transaction([
    prisma.reviewPlanPeriod.updateMany({
      where: { leadId, status: "Active" },
      data: { status: "Stopped" },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: {
        reviewTrialStatus: "Stopped",
        reviewTrialUpdatedAt: new Date(),
      },
    }),
  ]);

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

const reviewFollowUpActionSelect = {
  businessName: true,
  area: true,
  reviewCount: true,
  googleRating: true,
  reviewPlanType: true,
  reviewTrialStartAt: true,
  reviewTrialEndAt: true,
  reviewPublicUrl: true,
  reviewMerchantUrl: true,
  reviewTrialCheckInDraft: true,
  reviewRenewalReminderDraft: true,
  reviewExpiredReminder1Draft: true,
  reviewExpiredFollowUp1Draft: true,
  reviewExpiredFollowUp2Draft: true,
  reviewTrialCheckInSentAt: true,
  reviewRenewalReminderSentAt: true,
  reviewExpiredReminder1SentAt: true,
  reviewExpiredFollowUp1SentAt: true,
  reviewExpiredFollowUp2SentAt: true,
} as const;

export type ReviewFollowUpDraftActionResult =
  | { ok: true; draft: string; sentAt: string | null }
  | { ok: false; error: string };

export type ReviewFollowUpMarkSentActionResult =
  | { ok: true; sentAt: string }
  | { ok: false; error: string };

function parseReviewFollowUpType(
  followUpType: string,
): ReviewFollowUpActionKey | null {
  return isReviewFollowUpActionKey(followUpType) ? followUpType : null;
}

export async function generateReviewFollowUpDraftAction(
  leadId: string,
  followUpType: string,
): Promise<ReviewFollowUpDraftActionResult> {
  const type = parseReviewFollowUpType(followUpType);
  if (!type) {
    return { ok: false, error: "Invalid follow-up type." };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: reviewFollowUpActionSelect,
  });
  if (!lead) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  const draft = buildReviewFollowUpMessage(type, lead);
  const draftField = REVIEW_FOLLOW_UP_DRAFT_FIELDS[type];
  const sentField = REVIEW_FOLLOW_UP_SENT_FIELDS[type];

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      [draftField]: draft,
      reviewTrialUpdatedAt: new Date(),
    },
  });

  revalidateReviewTrialPaths(leadId);
  return {
    ok: true,
    draft,
    sentAt: lead[sentField]?.toISOString() ?? null,
  };
}

export async function updateReviewFollowUpDraftAction(
  leadId: string,
  followUpType: string,
  body: string,
): Promise<ReviewFollowUpDraftActionResult> {
  const type = parseReviewFollowUpType(followUpType);
  if (!type) {
    return { ok: false, error: "Invalid follow-up type." };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Draft cannot be empty." };
  }

  if (!(await ensureLeadExists(leadId))) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  const draftField = REVIEW_FOLLOW_UP_DRAFT_FIELDS[type];
  const sentField = REVIEW_FOLLOW_UP_SENT_FIELDS[type];

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      [draftField]: trimmed,
      reviewTrialUpdatedAt: new Date(),
    },
    select: reviewFollowUpActionSelect,
  });

  revalidateReviewTrialPaths(leadId);
  return {
    ok: true,
    draft: trimmed,
    sentAt: updated[sentField]?.toISOString() ?? null,
  };
}

export async function markReviewFollowUpSentAction(
  leadId: string,
  followUpType: string,
): Promise<ReviewFollowUpMarkSentActionResult> {
  const type = parseReviewFollowUpType(followUpType);
  if (!type) {
    return { ok: false, error: "Invalid follow-up type." };
  }

  if (!(await ensureLeadExists(leadId))) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }

  const sentField = REVIEW_FOLLOW_UP_SENT_FIELDS[type];
  const now = new Date();

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      [sentField]: now,
      reviewTrialUpdatedAt: now,
    },
  });

  revalidateReviewTrialPaths(leadId);
  return { ok: true, sentAt: now.toISOString() };
}
