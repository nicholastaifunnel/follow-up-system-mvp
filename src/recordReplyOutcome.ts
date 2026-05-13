import type { Prisma, PrismaClient } from "@prisma/client";

export const REPLY_CHECK_SNAPSHOT_SELECT = {
  businessName: true,
  messageStatus: true,
  replyStatus: true,
  replyOutcome: true,
  contactStatus: true,
  leadTemperature: true,
  handoffRequired: true,
  handoffReason: true,
  nextAction: true,
  nextCheckAt: true,
  nextFollowUpAt: true,
  isArchived: true,
  archivedReason: true,
} as const;

export type ReplyCheckSnapshot = Prisma.LeadGetPayload<{
  select: typeof REPLY_CHECK_SNAPSHOT_SELECT;
}>;

export const SUPPORTED_OUTCOMES = [
  "no-reply",
  "asked-price",
  "interested",
  "follow-up-later",
  "not-interested",
  "wrong-contact",
  "need-more-info",
] as const;

export type ReplyOutcomeKey = (typeof SUPPORTED_OUTCOMES)[number];

export type RecordReplyOutcomeInput = {
  leadId: string;
  outcome: ReplyOutcomeKey;
  replyNotes?: string | null;
  /** Used for `follow-up-later` when provided and valid. */
  nextFollowUpAt?: Date | null;
};

function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizeNotes(notes: string | null | undefined): string | null {
  if (notes === undefined || notes === null) return null;
  const t = notes.trim();
  return t.length ? t : null;
}

function inboundFieldsFromNotes(
  notes: string | null,
  now: Date,
): Pick<Prisma.LeadUpdateInput, "replyNotes" | "lastInboundMessage" | "lastInboundMessageAt"> {
  if (!notes) return {};
  return {
    replyNotes: notes,
    lastInboundMessage: notes,
    lastInboundMessageAt: now,
  };
}

function assertOutcome(outcome: string): asserts outcome is ReplyOutcomeKey {
  if (!SUPPORTED_OUTCOMES.includes(outcome as ReplyOutcomeKey)) {
    throw new Error(
      `Invalid outcome "${outcome}". Expected one of: ${SUPPORTED_OUTCOMES.join(", ")}`,
    );
  }
}

function buildUpdateData(
  input: RecordReplyOutcomeInput,
  now: Date,
): Prisma.LeadUpdateInput {
  const notes = normalizeNotes(input.replyNotes);
  const inbound = inboundFieldsFromNotes(notes, now);

  switch (input.outcome) {
    case "no-reply":
      return {
        replyStatus: "No Reply Yet",
        replyOutcome: null,
        handoffRequired: false,
        handoffReason: null,
        nextAction: null,
        lastCheckedAt: now,
        checkCount: { increment: 1 },
        nextCheckAt: addHours(now, 24),
      };

    case "asked-price":
      return {
        replyStatus: "Replied",
        replyOutcome: "Asked Price",
        leadTemperature: "Hot",
        handoffRequired: true,
        handoffReason: "Asked price",
        nextAction: "Send price/package",
        nextCheckAt: null,
        nextFollowUpAt: null,
        ...inbound,
      };

    case "interested":
      return {
        replyStatus: "Replied",
        replyOutcome: "Interested",
        leadTemperature: "Hot",
        handoffRequired: true,
        handoffReason: "Interested lead",
        nextAction: "Follow up personally",
        nextCheckAt: null,
        nextFollowUpAt: null,
        ...inbound,
      };

    case "follow-up-later": {
      let nextFollow: Date;
      if (input.nextFollowUpAt && !Number.isNaN(input.nextFollowUpAt.getTime())) {
        nextFollow = input.nextFollowUpAt;
      } else {
        nextFollow = addDays(now, 7);
      }
      return {
        replyStatus: "Replied",
        replyOutcome: "Follow Up Later",
        contactStatus: "Follow Up",
        leadTemperature: "Warm",
        handoffRequired: false,
        handoffReason: null,
        nextAction: "Follow up later",
        nextCheckAt: null,
        nextFollowUpAt: nextFollow,
        ...inbound,
      };
    }

    case "not-interested":
      return {
        replyStatus: "Stopped",
        replyOutcome: "Not Interested",
        messageStatus: "Stopped",
        contactStatus: "Not Interested",
        leadTemperature: "Cold",
        handoffRequired: false,
        handoffReason: null,
        nextAction: null,
        nextCheckAt: null,
        nextFollowUpAt: null,
        isArchived: true,
        archivedAt: now,
        archivedReason: "Not interested",
        ...inbound,
      };

    case "wrong-contact":
      return {
        replyStatus: "Stopped",
        replyOutcome: "Wrong Contact",
        messageStatus: "Stopped",
        contactStatus: "Wrong Contact",
        leadTemperature: "Cold",
        handoffRequired: false,
        handoffReason: null,
        nextAction: null,
        nextCheckAt: null,
        nextFollowUpAt: null,
        isArchived: true,
        archivedAt: now,
        archivedReason: "Wrong contact",
        ...inbound,
      };

    case "need-more-info":
      return {
        replyStatus: "Replied",
        replyOutcome: "Need More Info",
        leadTemperature: "Warm",
        handoffRequired: true,
        handoffReason: "Need more info",
        nextAction: "Reply with more information",
        nextCheckAt: null,
        nextFollowUpAt: null,
        ...inbound,
      };
  }
}

/**
 * Records a manual WhatsApp reply check outcome. Does not call any external API.
 */
export async function recordReplyOutcome(
  db: PrismaClient,
  input: RecordReplyOutcomeInput,
): Promise<ReplyCheckSnapshot> {
  assertOutcome(input.outcome);

  const exists = await db.lead.findUnique({
    where: { id: input.leadId },
    select: { id: true },
  });
  if (!exists) {
    throw new Error(`Lead not found: ${input.leadId}`);
  }

  const now = new Date();
  const data = buildUpdateData(input, now);

  return db.lead.update({
    where: { id: input.leadId },
    data,
    select: REPLY_CHECK_SNAPSHOT_SELECT,
  });
}
