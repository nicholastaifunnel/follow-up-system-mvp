import type { Lead, MessageTemplate, PrismaClient } from "@prisma/client";
import {
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
} from "./statusConstants";

export type PrepareLeadMessageInput = {
  leadId: string;
  messageStage?: string;
  /**
   * When true, skips the messageStatus guard only (still blocks archived /
   * Replied / Stopped / handoff). For manual recovery; not for routine CLI use.
   */
  force?: boolean;
};

function assertCanPrepareLead(lead: Lead, input: PrepareLeadMessageInput): void {
  if (lead.isArchived) {
    throw new Error("Lead cannot be prepared: lead is archived");
  }

  const status = lead.messageStatus ?? "(null)";
  if (!input.force) {
    if (
      lead.messageStatus !== MESSAGE_STATUS_NOT_PREPARED &&
      lead.messageStatus !== MESSAGE_STATUS_PREPARED
    ) {
      throw new Error(
        `Lead cannot be prepared from current message status: ${status}`,
      );
    }
  }

  if (lead.replyStatus === "Replied" || lead.replyStatus === "Stopped") {
    throw new Error(
      `Lead cannot be prepared from current reply status: ${lead.replyStatus}`,
    );
  }

  if (lead.handoffRequired) {
    throw new Error("Lead cannot be prepared: handoff is required");
  }
}

export type PrepareLeadMessageResult = {
  leadId: string;
  businessName: string;
  assignedIndustry: string | null;
  leadLevel: string | null;
  templateId: string;
  templateName: string;
  preparedMessage: string;
};

function formatOptionalMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}

function renderTemplateBody(template: string, lead: Lead): string {
  const businessName = (lead.businessName ?? "").trim() || "there";
  const area = (lead.area ?? "").trim() || "your area";
  const assignedIndustry =
    (lead.assignedIndustry ?? "").trim() || "your business";
  const leadLevel = (lead.leadLevel ?? "").trim();
  const website = (lead.website ?? "").trim();
  const reviewCount = formatOptionalMetric(lead.reviewCount);
  const googleRating = formatOptionalMetric(lead.googleRating);

  return template
    .replaceAll("{businessName}", businessName)
    .replaceAll("{area}", area)
    .replaceAll("{assignedIndustry}", assignedIndustry)
    .replaceAll("{leadLevel}", leadLevel)
    .replaceAll("{website}", website)
    .replaceAll("{reviewCount}", reviewCount)
    .replaceAll("{googleRating}", googleRating);
}

async function findActivePresetTemplate(
  db: PrismaClient,
  messageStage: string,
): Promise<MessageTemplate> {
  const activePreset = await db.messageTemplatePreset.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  if (!activePreset) {
    throw new Error("No active message template preset found.");
  }

  const template = await db.messageTemplate.findFirst({
    where: {
      presetId: activePreset.id,
      messageStage,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });
  if (!template) {
    throw new Error(
      `Active preset "${activePreset.name}" is missing template stage: ${messageStage}.`,
    );
  }
  return template;
}

/**
 * Selects a MessageTemplate from the active preset + requested stage,
 * renders placeholders, updates Lead prepared fields and messageStatus only.
 */
export async function prepareLeadMessage(
  db: PrismaClient,
  input: PrepareLeadMessageInput,
): Promise<PrepareLeadMessageResult> {
  const messageStage = input.messageStage ?? "First Message";

  const lead = await db.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) {
    throw new Error(`Lead not found: ${input.leadId}`);
  }

  assertCanPrepareLead(lead, input);

  const template = await findActivePresetTemplate(db, messageStage);

  const preparedMessage = renderTemplateBody(template.body, lead);

  await db.lead.update({
    where: { id: lead.id },
    data: {
      messageTemplateId: template.id,
      preparedMessage,
      preparedAt: new Date(),
      messageStatus: MESSAGE_STATUS_PREPARED,
    },
  });

  return {
    leadId: lead.id,
    businessName: lead.businessName,
    assignedIndustry: lead.assignedIndustry,
    leadLevel: lead.leadLevel,
    templateId: template.id,
    templateName: template.name,
    preparedMessage,
  };
}
