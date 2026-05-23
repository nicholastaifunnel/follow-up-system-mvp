"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { approveAdLeadForFreeTrial } from "@/approveAdLeadForTrial";
import {
  AD_LEAD_NEED_MORE_INFO,
  AD_LEAD_REJECTED,
} from "@/adLeadStatus";
import { appendManualNote } from "@/adLeadProtection";

export type AdLeadActionResult = { ok: true } | { ok: false; error: string };

export async function approveAdLeadAction(leadId: string): Promise<AdLeadActionResult> {
  const result = await approveAdLeadForFreeTrial(prisma, leadId);
  if (!result.ok) return result;
  revalidatePath("/ad-leads");
  revalidatePath("/review-trials");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function needMoreInfoAdLeadAction(
  leadId: string,
  notes: string,
): Promise<AdLeadActionResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead?.trialRequestedAt) return { ok: false, error: "Not an ad lead request." };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      adLeadStatus: AD_LEAD_NEED_MORE_INFO,
      manualNotes: notes.trim()
        ? appendManualNote(lead.manualNotes, notes.trim())
        : lead.manualNotes,
    },
  });
  revalidatePath("/ad-leads");
  return { ok: true };
}

export async function rejectAdLeadAction(
  leadId: string,
  notes: string,
): Promise<AdLeadActionResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead?.trialRequestedAt) return { ok: false, error: "Not an ad lead request." };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      adLeadStatus: AD_LEAD_REJECTED,
      manualNotes: notes.trim()
        ? appendManualNote(lead.manualNotes, notes.trim())
        : lead.manualNotes,
    },
  });
  revalidatePath("/ad-leads");
  return { ok: true };
}

export async function saveAdLeadNotesAction(
  leadId: string,
  notes: string,
): Promise<AdLeadActionResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead?.trialRequestedAt) return { ok: false, error: "Not an ad lead request." };

  await prisma.lead.update({
    where: { id: leadId },
    data: { manualNotes: notes.trim() || lead.manualNotes },
  });
  revalidatePath("/ad-leads");
  return { ok: true };
}
