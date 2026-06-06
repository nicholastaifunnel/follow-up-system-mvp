"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MESSAGE_STATUS_PREPARED } from "@/statusConstants";

export type AgentLeadActionResult = { ok: true } | { ok: false; error: string };

export async function needManualForAgentAction(
  leadId: string,
): Promise<AgentLeadActionResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { isArchived: true, skippedAt: true, messageStatus: true },
  });

  if (!lead) {
    return { ok: false, error: `Lead not found: ${leadId}` };
  }
  if (lead.isArchived) {
    return { ok: false, error: "Archived leads cannot be updated." };
  }
  if (lead.skippedAt) {
    return { ok: false, error: "Skipped leads cannot be updated." };
  }
  if (lead.messageStatus !== MESSAGE_STATUS_PREPARED) {
    return {
      ok: false,
      error: "Need Manual is only for Prepared leads on this page.",
    };
  }

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        handoffRequired: true,
        handoffReason: "Needs manual review",
      },
    });
    revalidatePath("/agent-leads");
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/queues");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not flag lead for manual review.";
    return { ok: false, error: message };
  }
}
