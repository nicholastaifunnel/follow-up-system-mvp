"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const STAGES = [
  "First Message",
  "First Follow Up",
  "Second Follow Up",
] as const;

export type MessagePresetActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createMessageTemplatePresetAction(
  name: string,
): Promise<MessagePresetActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, error: "Preset name is required." };

  try {
    await prisma.$transaction(async (tx) => {
      const hasActive = await tx.messageTemplatePreset.findFirst({
        where: { isActive: true },
        select: { id: true },
      });

      await tx.messageTemplatePreset.create({
        data: {
          name: trimmedName,
          isActive: !hasActive,
          templates: {
            create: STAGES.map((messageStage) => ({
              name: `${trimmedName} - ${messageStage}`,
              messageStage,
              language: "en",
              body: "",
              isActive: true,
            })),
          },
        },
      });
    });
    revalidatePath("/message-templates");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not create preset.";
    return { ok: false, error: message };
  }
}

export async function updateMessageTemplatePresetAction(
  presetId: string,
  bodies: Record<string, string>,
): Promise<MessagePresetActionResult> {
  for (const stage of STAGES) {
    if (!(bodies[stage] ?? "").trim()) {
      return { ok: false, error: `${stage} cannot be empty.` };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const preset = await tx.messageTemplatePreset.findUnique({
        where: { id: presetId },
        include: { templates: true },
      });
      if (!preset) throw new Error("Preset not found.");

      for (const stage of STAGES) {
        const template = preset.templates.find(
          (item) => item.messageStage === stage,
        );
        const body = bodies[stage].trim();
        if (template) {
          await tx.messageTemplate.update({
            where: { id: template.id },
            data: { body, isActive: true },
          });
        } else {
          await tx.messageTemplate.create({
            data: {
              presetId,
              name: `${preset.name} - ${stage}`,
              messageStage: stage,
              language: "en",
              body,
              isActive: true,
            },
          });
        }
      }
    });
    revalidatePath("/message-templates");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save preset.";
    return { ok: false, error: message };
  }
}

export async function setActiveMessageTemplatePresetAction(
  presetId: string,
): Promise<MessagePresetActionResult> {
  try {
    await prisma.$transaction([
      prisma.messageTemplatePreset.updateMany({
        data: { isActive: false },
      }),
      prisma.messageTemplatePreset.update({
        where: { id: presetId },
        data: { isActive: true },
      }),
    ]);
    revalidatePath("/message-templates");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not activate preset.";
    return { ok: false, error: message };
  }
}

export async function deleteMessageTemplatePresetAction(
  presetId: string,
): Promise<MessagePresetActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const preset = await tx.messageTemplatePreset.findUnique({
        where: { id: presetId },
        select: { id: true, isActive: true },
      });
      if (!preset) throw new Error("Preset not found.");

      await tx.messageTemplate.deleteMany({
        where: { presetId },
      });
      await tx.messageTemplatePreset.delete({
        where: { id: presetId },
      });

      if (preset.isActive) {
        const nextPreset = await tx.messageTemplatePreset.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });

        await tx.messageTemplatePreset.updateMany({
          data: { isActive: false },
        });

        if (nextPreset) {
          await tx.messageTemplatePreset.update({
            where: { id: nextPreset.id },
            data: { isActive: true },
          });
        }
      }
    });
    revalidatePath("/message-templates");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not delete preset.";
    return { ok: false, error: message };
  }
}
