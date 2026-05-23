import type { PrismaClient } from "@prisma/client";
import { AD_LEAD_APPROVED } from "./adLeadStatus";
import {
  AD_LEAD_APPROVAL_BLOCKED_NOTE,
  appendManualNote,
  isProtectedCustomerLead,
} from "./adLeadProtection";
import { LEAD_REVIEW_NEEDS_REVIEW } from "./leadReviewStatus";
import { computePlanEndDate } from "./reviewPlanFollowUp";
import { dateOnlyUtc } from "./reviewTrialStatus";
import { getDefaultPlanAmountCents } from "./reviewPlanConstants";

export type ApproveAdLeadResult = { ok: true } | { ok: false; error: string };

export async function approveAdLeadForFreeTrial(
  db: PrismaClient,
  leadId: string,
): Promise<ApproveAdLeadResult> {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };
  if (!lead.trialRequestedAt) {
    return { ok: false, error: "This lead is not an ad trial request." };
  }
  if (lead.adLeadStatus === AD_LEAD_APPROVED && lead.adApprovedAt) {
    return { ok: true };
  }

  if (isProtectedCustomerLead(lead)) {
    await db.lead.update({
      where: { id: leadId },
      data: {
        manualNotes: appendManualNote(lead.manualNotes, AD_LEAD_APPROVAL_BLOCKED_NOTE),
      },
    });
    return {
      ok: false,
      error:
        "Cannot approve: this lead is already an active or protected customer (trial, paid, or converted).",
    };
  }

  const now = new Date();
  const start = dateOnlyUtc(now);
  const end = computePlanEndDate(start, "Free Trial");
  const amountCents = getDefaultPlanAmountCents("Free Trial");

  await db.$transaction([
    db.reviewPlanPeriod.updateMany({
      where: { leadId, status: "Active" },
      data: { status: "Replaced" },
    }),
    db.lead.update({
      where: { id: leadId },
      data: {
        adLeadStatus: AD_LEAD_APPROVED,
        adApprovedAt: now,
        outreachReadiness: LEAD_REVIEW_NEEDS_REVIEW,
        reviewPlanType: "Free Trial",
        reviewTrialStatus: "Trial Active",
        reviewTrialStartAt: start,
        reviewTrialEndAt: end,
        reviewPlanAmountCents: amountCents,
        reviewPlanCurrency: lead.reviewPlanCurrency ?? "MYR",
        reviewTrialUpdatedAt: now,
        reviewTrialCheckInSentAt: null,
        reviewRenewalReminderSentAt: null,
        reviewExpiredReminder1SentAt: null,
        reviewExpiredFollowUp1SentAt: null,
        reviewExpiredFollowUp2SentAt: null,
      },
    }),
    db.reviewPlanPeriod.create({
      data: {
        leadId,
        planType: "Free Trial",
        startAt: start,
        endAt: end,
        priceCents: amountCents,
        amountCents,
        currency: lead.reviewPlanCurrency ?? "MYR",
        status: "Active",
        source: "Ad Lead Approval",
      },
    }),
  ]);

  return { ok: true };
}
