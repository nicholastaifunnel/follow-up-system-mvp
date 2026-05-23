import type { Prisma } from "@prisma/client";

export const DNC_NOT_INTERESTED = "Not Interested";
export const DNC_WRONG_PERSON = "Wrong Person";
export const DNC_BLOCK_RISK = "Block Risk";
export const DNC_DO_NOT_CONTACT = "Do Not Contact";
export const DNC_WRONG_CONTACT = "Wrong Contact";
export const DNC_STOP_CONTACTING = "Stop Contacting";

export const DO_NOT_CONTACT_ACTIONS = [
  {
    key: "not-interested",
    label: "Not Interested",
    contactStatus: DNC_NOT_INTERESTED,
    replyOutcome: DNC_NOT_INTERESTED,
    archivedReason: "Not interested",
  },
  {
    key: "wrong-person",
    label: "Wrong Person",
    contactStatus: DNC_WRONG_PERSON,
    replyOutcome: DNC_WRONG_PERSON,
    archivedReason: "Wrong person",
  },
  {
    key: "block-risk",
    label: "Block Risk",
    contactStatus: DNC_BLOCK_RISK,
    replyOutcome: DNC_BLOCK_RISK,
    archivedReason: "Block risk",
  },
  {
    key: "do-not-contact",
    label: "Do Not Contact",
    contactStatus: DNC_DO_NOT_CONTACT,
    replyOutcome: DNC_DO_NOT_CONTACT,
    archivedReason: "Do not contact",
  },
] as const;

export type DoNotContactActionKey = (typeof DO_NOT_CONTACT_ACTIONS)[number]["key"];

const DNC_CONTACT_STATUSES = [
  DNC_NOT_INTERESTED,
  DNC_WRONG_PERSON,
  DNC_BLOCK_RISK,
  DNC_DO_NOT_CONTACT,
  DNC_WRONG_CONTACT,
] as const;

const DNC_REPLY_OUTCOMES = [
  DNC_NOT_INTERESTED,
  DNC_WRONG_PERSON,
  DNC_BLOCK_RISK,
  DNC_DO_NOT_CONTACT,
  DNC_WRONG_CONTACT,
  DNC_STOP_CONTACTING,
] as const;

const DNC_ARCHIVED_REASONS = [
  "not interested",
  "wrong contact",
  "wrong person",
  "block risk",
  "do not contact",
  "stop contacting",
] as const;

export type DoNotContactFields = {
  isArchived?: boolean | null;
  archivedReason?: string | null;
  messageStatus?: string | null;
  replyStatus?: string | null;
  replyOutcome?: string | null;
  contactStatus?: string | null;
};

export function isDoNotContactActionKey(
  value: string,
): value is DoNotContactActionKey {
  return DO_NOT_CONTACT_ACTIONS.some((action) => action.key === value);
}

export function getDoNotContactAction(key: DoNotContactActionKey) {
  return DO_NOT_CONTACT_ACTIONS.find((action) => action.key === key)!;
}

export function isDoNotContactLead(lead: DoNotContactFields): boolean {
  if (lead.messageStatus === "Stopped" || lead.replyStatus === "Stopped") {
    return true;
  }

  if (
    lead.contactStatus &&
    (DNC_CONTACT_STATUSES as readonly string[]).includes(lead.contactStatus)
  ) {
    return true;
  }

  if (
    lead.replyOutcome &&
    (DNC_REPLY_OUTCOMES as readonly string[]).includes(lead.replyOutcome)
  ) {
    return true;
  }

  const archivedReason = lead.archivedReason?.trim().toLowerCase();
  return Boolean(
    lead.isArchived &&
      archivedReason &&
      (DNC_ARCHIVED_REASONS as readonly string[]).includes(archivedReason),
  );
}

export function doNotContactReasonLabel(lead: DoNotContactFields): string | null {
  if (!isDoNotContactLead(lead)) return null;
  return (
    lead.replyOutcome ??
    lead.contactStatus ??
    lead.archivedReason ??
    "Do Not Contact"
  );
}

export function activeOutreachWhere(): Prisma.LeadWhereInput {
  return {
    isArchived: false,
    skippedAt: null,
    AND: [
      { messageStatus: { not: "Stopped" } },
      { OR: [{ replyStatus: null }, { replyStatus: { not: "Stopped" } }] },
      { contactStatus: { notIn: [...DNC_CONTACT_STATUSES] } },
      { OR: [{ replyOutcome: null }, { replyOutcome: { notIn: [...DNC_REPLY_OUTCOMES] } }] },
    ],
  };
}

export function withActiveOutreachWhere(
  where: Prisma.LeadWhereInput,
): Prisma.LeadWhereInput {
  return {
    AND: [activeOutreachWhere(), where],
  };
}
