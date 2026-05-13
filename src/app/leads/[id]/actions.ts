"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { prepareLeadMessage } from "../../../prepareLeadMessage";

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
