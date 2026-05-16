"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const STAGES = [
  "First Message",
  "First Follow Up",
  "Second Follow Up",
] as const;

export type MessagePresetActionResult =
  | { ok: true; presetId?: string }
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
  presetName: string,
  bodies: Record<string, string>,
): Promise<MessagePresetActionResult> {
  const trimmedName = presetName.trim();
  if (!trimmedName) return { ok: false, error: "Preset name is required." };

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

      const duplicateName = await tx.messageTemplatePreset.findFirst({
        where: {
          id: { not: presetId },
          name: trimmedName,
        },
        select: { id: true },
      });
      if (duplicateName) throw new Error("Another preset already uses this name.");

      await tx.messageTemplatePreset.update({
        where: { id: presetId },
        data: { name: trimmedName },
      });

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
              name: `${trimmedName} - ${stage}`,
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

export async function duplicateMessageTemplatePresetAction(
  presetId: string,
): Promise<MessagePresetActionResult> {
  try {
    const duplicate = await prisma.$transaction(async (tx) => {
      const preset = await tx.messageTemplatePreset.findUnique({
        where: { id: presetId },
        include: { templates: true },
      });
      if (!preset) throw new Error("Preset not found.");

      const existingNames = await tx.messageTemplatePreset.findMany({
        where: {
          name: {
            startsWith: `${preset.name} Copy`,
          },
        },
        select: { name: true },
      });
      const usedNames = new Set(existingNames.map((item) => item.name));
      let copyName = `${preset.name} Copy`;
      let copyNumber = 2;
      while (usedNames.has(copyName)) {
        copyName = `${preset.name} Copy ${copyNumber}`;
        copyNumber += 1;
      }

      return tx.messageTemplatePreset.create({
        data: {
          name: copyName,
          isActive: false,
          templates: {
            create: STAGES.map((stage) => {
              const sourceTemplate = preset.templates.find(
                (template) => template.messageStage === stage,
              );
              return {
                name: `${copyName} - ${stage}`,
                messageStage: stage,
                language: sourceTemplate?.language ?? "en",
                body: sourceTemplate?.body ?? "",
                isActive: sourceTemplate?.isActive ?? true,
              };
            }),
          },
        },
      });
    });
    revalidatePath("/message-templates");
    return { ok: true, presetId: duplicate.id };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not duplicate preset.";
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
