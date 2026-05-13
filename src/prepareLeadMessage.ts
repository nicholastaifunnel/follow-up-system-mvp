import type { Lead, MessageTemplate, PrismaClient } from "@prisma/client";
import {
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
} from "./statusConstants";

export type PrepareLeadMessageInput = {
  leadId: string;
  messageStage?: string;
  language?: string;
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

function normNullable(value: string | null | undefined): string | null {
  const t = (value ?? "").trim();
  return t.length ? t : null;
}

function renderTemplateBody(template: string, lead: Lead): string {
  const businessName = (lead.businessName ?? "").trim() || "there";
  const area = (lead.area ?? "").trim() || "your area";
  const assignedIndustry =
    (lead.assignedIndustry ?? "").trim() || "your business";
  const leadLevel = (lead.leadLevel ?? "").trim();
  const website = (lead.website ?? "").trim();

  return template
    .replaceAll("{businessName}", businessName)
    .replaceAll("{area}", area)
    .replaceAll("{assignedIndustry}", assignedIndustry)
    .replaceAll("{leadLevel}", leadLevel)
    .replaceAll("{website}", website);
}

async function findMatchingTemplate(
  db: PrismaClient,
  params: {
    assignedIndustry: string | null;
    leadLevel: string | null;
    messageStage: string;
    language: string;
  },
): Promise<MessageTemplate | null> {
  const { assignedIndustry: ind, leadLevel: lvl, messageStage, language } =
    params;

  const base = { messageStage, language, isActive: true };

  if (ind && lvl) {
    const t = await db.messageTemplate.findFirst({
      where: { ...base, industry: ind, leadLevel: lvl },
      orderBy: { createdAt: "asc" },
    });
    if (t) return t;
  }

  if (ind) {
    const t = await db.messageTemplate.findFirst({
      where: { ...base, industry: ind, leadLevel: null },
      orderBy: { createdAt: "asc" },
    });
    if (t) return t;
  }

  if (lvl) {
    const t = await db.messageTemplate.findFirst({
      where: { ...base, industry: null, leadLevel: lvl },
      orderBy: { createdAt: "asc" },
    });
    if (t) return t;
  }

  return db.messageTemplate.findFirst({
    where: { ...base, industry: null, leadLevel: null },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Selects a MessageTemplate from assignedIndustry + leadLevel + stage + language,
 * renders placeholders, updates Lead prepared fields and messageStatus only.
 */
export async function prepareLeadMessage(
  db: PrismaClient,
  input: PrepareLeadMessageInput,
): Promise<PrepareLeadMessageResult> {
  const messageStage = input.messageStage ?? "First Message";
  const language = input.language ?? "en";

  const lead = await db.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) {
    throw new Error(`Lead not found: ${input.leadId}`);
  }

  assertCanPrepareLead(lead, input);

  const assignedIndustry = normNullable(lead.assignedIndustry);
  const leadLevel = normNullable(lead.leadLevel);

  const template = await findMatchingTemplate(db, {
    assignedIndustry,
    leadLevel,
    messageStage,
    language,
  });

  if (!template) {
    throw new Error(
      `No message template matched (stage=${messageStage}, language=${language}).`,
    );
  }

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
