"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";

export type UpdateReplySopTemplateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateReplySopTemplateAction(
  id: string,
  body: string,
): Promise<UpdateReplySopTemplateResult> {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Body cannot be empty." };
  }

  try {
    await prisma.replySopTemplate.update({
      where: { id },
      data: { body: trimmed },
    });
    revalidatePath("/reply-sop");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Update failed. Please try again.";
    return { ok: false, error: message };
  }
}
