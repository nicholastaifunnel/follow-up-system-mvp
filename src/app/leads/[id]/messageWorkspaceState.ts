import type { BaseMessageStage } from "@/messageTemplatePresetStages";
import {
  MESSAGE_STATUS_FIRST_SENT,
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
} from "@/statusConstants";

export type MessageWorkspaceMode =
  | "first-message"
  | "first-follow-up-scheduled"
  | "first-follow-up-due"
  | "second-follow-up-scheduled"
  | "second-follow-up-due"
  | "replied-or-handoff"
  | "skipped"
  | "archived"
  | "blocked";

export type MessageWorkspaceState = {
  mode: MessageWorkspaceMode;
  statusNote: string | null;
  canPrepare: boolean;
  prepareLabel: string;
  messageStage: BaseMessageStage | null;
  canMarkSent: boolean;
  markFollowUpWhich: 1 | 2 | null;
};

type LeadSnapshot = {
  isArchived: boolean;
  skippedAt: Date | null;
  messageStatus: string;
  replyStatus: string | null;
  handoffRequired: boolean;
  followUp1SentAt: Date | null;
  followUp2SentAt: Date | null;
  nextFollowUpAt: Date | null;
  preparedTrimLength: number;
};

function isFollowUpDue(nextFollowUpAt: Date | null, now: Date): boolean {
  if (!nextFollowUpAt) return true;
  return nextFollowUpAt.getTime() <= now.getTime();
}

export function computeMessageWorkspaceState(
  lead: LeadSnapshot,
  now = new Date(),
): MessageWorkspaceState {
  const blocked: MessageWorkspaceState = {
    mode: "blocked",
    statusNote: "This lead cannot be prepared from the current status.",
    canPrepare: false,
    prepareLabel: "Prepare Message",
    messageStage: null,
    canMarkSent: false,
    markFollowUpWhich: null,
  };

  if (lead.isArchived) {
    return { ...blocked, mode: "archived", statusNote: "Archived leads cannot use Message Workspace." };
  }

  if (lead.skippedAt) {
    return {
      ...blocked,
      mode: "skipped",
      statusNote:
        "Skipped from Message Queue. Use Restore below to return this lead to the Message Queue.",
    };
  }

  if (lead.replyStatus === "Replied" || lead.replyStatus === "Stopped" || lead.handoffRequired) {
    return {
      mode: "replied-or-handoff",
      statusNote:
        "Customer replied or needs manual handling. Continue in Reply Assistant.",
      canPrepare: false,
      prepareLabel: "Prepare Message",
      messageStage: null,
      canMarkSent: false,
      markFollowUpWhich: null,
    };
  }

  if (
    lead.messageStatus === MESSAGE_STATUS_NOT_PREPARED ||
    lead.messageStatus === MESSAGE_STATUS_PREPARED
  ) {
    const canMarkSent =
      lead.messageStatus === MESSAGE_STATUS_PREPARED && lead.preparedTrimLength > 0;
    return {
      mode: "first-message",
      statusNote: null,
      canPrepare: true,
      prepareLabel: "Prepare first message",
      messageStage: "First Message",
      canMarkSent,
      markFollowUpWhich: null,
    };
  }

  if (lead.messageStatus === MESSAGE_STATUS_FIRST_SENT && !lead.followUp1SentAt) {
    const due = isFollowUpDue(lead.nextFollowUpAt, now);
    if (!due) {
      return {
        mode: "first-follow-up-scheduled",
        statusNote: null,
        canPrepare: false,
        prepareLabel: "Prepare first follow-up",
        messageStage: "First Follow Up",
        canMarkSent: false,
        markFollowUpWhich: null,
      };
    }
    return {
      mode: "first-follow-up-due",
      statusNote: null,
      canPrepare: true,
      prepareLabel: "Prepare first follow-up",
      messageStage: "First Follow Up",
      canMarkSent: false,
      markFollowUpWhich: 1,
    };
  }

  if (
    lead.messageStatus === MESSAGE_STATUS_FIRST_SENT &&
    lead.followUp1SentAt &&
    !lead.followUp2SentAt
  ) {
    const due = isFollowUpDue(lead.nextFollowUpAt, now);
    if (!due) {
      return {
        mode: "second-follow-up-scheduled",
        statusNote: null,
        canPrepare: false,
        prepareLabel: "Prepare second follow-up",
        messageStage: "Second Follow Up",
        canMarkSent: false,
        markFollowUpWhich: null,
      };
    }
    return {
      mode: "second-follow-up-due",
      statusNote: null,
      canPrepare: true,
      prepareLabel: "Prepare second follow-up",
      messageStage: "Second Follow Up",
      canMarkSent: false,
      markFollowUpWhich: 2,
    };
  }

  return blocked;
}

export function scheduledFollowUpNote(
  which: 1 | 2,
  nextFollowUpAt: Date | null,
  formatDateTimeMYT: (value: Date | null | undefined) => string,
): string {
  const label = which === 1 ? "First follow-up" : "Second follow-up";
  const when = nextFollowUpAt
    ? formatDateTimeMYT(nextFollowUpAt)
    : "the scheduled time";
  return `${label} scheduled for ${when}`;
}
