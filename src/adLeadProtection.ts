import type { Prisma } from "@prisma/client";
import { isDoNotContactLead, type DoNotContactFields } from "./doNotContact";
import {
  computeReviewPlanDisplayStatus,
  type ReviewPlanLeadFields,
} from "./reviewPlanFollowUp";

export type AdLeadProtectionFields = DoNotContactFields &
  ReviewPlanLeadFields & {
    reviewPlanType?: string | null;
    trialRequestedAt?: Date | null;
    adApprovedAt?: Date | null;
    adLeadStatus?: string | null;
  };

export function isProtectedCustomerLead(lead: AdLeadProtectionFields): boolean {
  if (
    lead.reviewTrialStatus === "Stopped" ||
    lead.reviewTrialStatus === "Converted Paid"
  ) {
    return true;
  }

  const display = computeReviewPlanDisplayStatus(lead);
  if (
    display === "Trial Active" ||
    display === "Trial Expiring Soon" ||
    display === "Paid Active"
  ) {
    return true;
  }

  if (lead.reviewPlanType === "Monthly Paid" || lead.reviewPlanType === "Yearly Paid") {
    if (lead.reviewTrialStartAt && lead.reviewTrialEndAt) {
      return true;
    }
  }

  return false;
}

export function appendManualNote(existing: string | null | undefined, line: string): string {
  const prev = (existing ?? "").trim();
  if (!prev) return line;
  if (prev.includes(line)) return prev;
  return `${prev}\n\n${line}`;
}

const INBOUND_AFTER_DNC_NOTE = "Inbound form submitted after previous DNC.";

export const AD_LEAD_APPROVAL_BLOCKED_NOTE =
  "Ad lead approval blocked because this lead is already an active/protected customer.";

/** Clears cold-outreach DNC blocking while preserving history in notes. */
export function buildDncReactivationUpdate(
  lead: DoNotContactFields & { manualNotes?: string | null },
  now: Date,
): Prisma.LeadUpdateInput {
  const data: Prisma.LeadUpdateInput = {
    manualNotes: appendManualNote(lead.manualNotes, INBOUND_AFTER_DNC_NOTE),
    isArchived: false,
    archivedAt: null,
    updatedAt: now,
  };

  if (lead.messageStatus === "Stopped") {
    data.messageStatus = "Not Prepared";
  }
  if (lead.replyStatus === "Stopped") {
    data.replyStatus = null;
  }

  const dncContact = [
    "Not Interested",
    "Wrong Person",
    "Block Risk",
    "Do Not Contact",
    "Wrong Contact",
  ];
  if (lead.contactStatus && dncContact.includes(lead.contactStatus)) {
    data.contactStatus = "Not Contacted";
  }

  const dncOutcome = [
    "Not Interested",
    "Wrong Person",
    "Block Risk",
    "Do Not Contact",
    "Wrong Contact",
    "Stop Contacting",
  ];
  if (lead.replyOutcome && dncOutcome.includes(lead.replyOutcome)) {
    data.replyOutcome = null;
  }

  return data;
}

export function shouldReactivateFromDnc(lead: DoNotContactFields): boolean {
  return isDoNotContactLead(lead);
}

export { INBOUND_AFTER_DNC_NOTE };
