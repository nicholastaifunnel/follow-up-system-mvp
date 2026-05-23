import type { Prisma, PrismaClient } from "@prisma/client";
import {
  DNC_BLOCK_RISK,
  DNC_DO_NOT_CONTACT,
  DNC_NOT_INTERESTED,
  DNC_STOP_CONTACTING,
  DNC_WRONG_CONTACT,
  DNC_WRONG_PERSON,
  withActiveOutreachWhere,
} from "./doNotContact";
import { getTodayFirstMessageSentCount } from "./getBatchSafetySummary";
import { getTodayActionQueue } from "./getTodayActionQueue";
import {
  LEAD_REVIEW_APPROVED,
  LEAD_REVIEW_NEED_MORE_INFO,
  LEAD_REVIEW_NEEDS_REVIEW,
  LEAD_REVIEW_REJECTED,
} from "./leadReviewStatus";
import {
  AD_LEAD_APPROVED,
  AD_LEAD_PENDING,
  AD_LEAD_REJECTED,
} from "./adLeadStatus";
import {
  getMalaysiaTodayIsoDate,
  mytCalendarDayUtcRange,
} from "./formatMalaysiaTime";
import {
  MESSAGE_STATUS_FIRST_SENT,
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
} from "./statusConstants";

export type SystemHealthSummary = {
  leadReview: {
    needsReview: number;
    ready: number;
    needMoreInfo: number;
    rejected: number;
  };
  outreach: {
    notPreparedReady: number;
    preparedNotSent: number;
    firstMessageSent: number;
    sentToday: number;
  };
  followUp: {
    firstFollowUpDue: number;
    secondFollowUpDue: number;
    needHumanReply: number;
    followUpDueTotal: number;
  };
  safety: {
    doNotContactStopped: number;
    skipped: number;
    missingAnyPhone: number;
    missingWhatsappPhone: number;
  };
  queueHealth: {
    prepareFirstMessage: number;
    sendPreparedMessage: number;
    firstFollowUpDue: number;
    secondFollowUpDue: number;
    needHumanReply: number;
  };
  riskFlags: {
    missingPhone: number;
    needMoreInfo: number;
    rejected: number;
    skipped: number;
    needHumanReply: number;
  };
  adLeads: {
    trialRequestsToday: number;
    pendingAdLeads: number;
    approvedAdLeads: number;
    rejectedAdLeads: number;
  };
};

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

/** Prisma where aligned with isDoNotContactLead() in doNotContact.ts */
function doNotContactWhere(): Prisma.LeadWhereInput {
  return {
    OR: [
      { messageStatus: "Stopped" },
      { replyStatus: "Stopped" },
      { contactStatus: { in: [...DNC_CONTACT_STATUSES] } },
      { replyOutcome: { in: [...DNC_REPLY_OUTCOMES] } },
      {
        AND: [
          { isArchived: true },
          {
            OR: DNC_ARCHIVED_REASONS.map((reason) => ({
              archivedReason: { equals: reason, mode: "insensitive" as const },
            })),
          },
        ],
      },
    ],
  };
}

function missingAnyPhoneWhere(): Prisma.LeadWhereInput {
  return {
    AND: [
      { OR: [{ phone: null }, { phone: "" }] },
      { OR: [{ internationalPhone: null }, { internationalPhone: "" }] },
    ],
  };
}

function missingWhatsappPhoneWhere(): Prisma.LeadWhereInput {
  return {
    OR: [{ whatsappPhone: null }, { whatsappPhone: "" }],
  };
}

async function count(db: PrismaClient, where: Prisma.LeadWhereInput): Promise<number> {
  return db.lead.count({ where });
}

/**
 * Read-only system health counts for /system-health (no writes).
 */
export async function getSystemHealthSummary(
  db: PrismaClient,
): Promise<SystemHealthSummary> {
  const [
    needsReview,
    ready,
    needMoreInfo,
    rejected,
    notPreparedReady,
    preparedNotSent,
    firstMessageSent,
    sentToday,
    doNotContactStopped,
    skipped,
    missingAnyPhone,
    missingWhatsappPhone,
    actionQueue,
    trialRequestsToday,
    pendingAdLeads,
    approvedAdLeads,
    rejectedAdLeads,
  ] = await Promise.all([
    count(db, {
      OR: [{ outreachReadiness: null }, { outreachReadiness: LEAD_REVIEW_NEEDS_REVIEW }],
    }),
    count(db, { outreachReadiness: LEAD_REVIEW_APPROVED }),
    count(db, { outreachReadiness: LEAD_REVIEW_NEED_MORE_INFO }),
    count(db, { outreachReadiness: LEAD_REVIEW_REJECTED }),
    count(
      db,
      withActiveOutreachWhere({
        messageStatus: MESSAGE_STATUS_NOT_PREPARED,
        outreachReadiness: LEAD_REVIEW_APPROVED,
      }),
    ),
    count(
      db,
      withActiveOutreachWhere({
        messageStatus: MESSAGE_STATUS_PREPARED,
        outreachReadiness: LEAD_REVIEW_APPROVED,
      }),
    ),
    count(db, { messageStatus: MESSAGE_STATUS_FIRST_SENT }),
    getTodayFirstMessageSentCount(db),
    count(db, doNotContactWhere()),
    count(db, { skippedAt: { not: null } }),
    count(db, missingAnyPhoneWhere()),
    count(db, missingWhatsappPhoneWhere()),
    getTodayActionQueue(db, { limit: 1, firstOutreachBatchLimit: 1 }),
    (() => {
      const range = mytCalendarDayUtcRange(getMalaysiaTodayIsoDate());
      return count(db, {
        trialRequestedAt: { gte: range.start, lt: range.endExclusive },
      });
    })(),
    count(db, { trialRequestedAt: { not: null }, adLeadStatus: AD_LEAD_PENDING }),
    count(db, { trialRequestedAt: { not: null }, adLeadStatus: AD_LEAD_APPROVED }),
    count(db, { trialRequestedAt: { not: null }, adLeadStatus: AD_LEAD_REJECTED }),
  ]);

  const firstFollowUpDue = actionQueue.firstFollowUpDue.count;
  const secondFollowUpDue = actionQueue.secondFollowUpDue.count;
  const needHumanReply = actionQueue.needHumanReply.count;

  return {
    leadReview: { needsReview, ready, needMoreInfo, rejected },
    outreach: {
      notPreparedReady,
      preparedNotSent,
      firstMessageSent,
      sentToday,
    },
    followUp: {
      firstFollowUpDue,
      secondFollowUpDue,
      needHumanReply,
      followUpDueTotal: firstFollowUpDue + secondFollowUpDue,
    },
    safety: {
      doNotContactStopped,
      skipped,
      missingAnyPhone,
      missingWhatsappPhone,
    },
    queueHealth: {
      prepareFirstMessage: actionQueue.prepareFirstMessage.count,
      sendPreparedMessage: actionQueue.sendPreparedMessage.count,
      firstFollowUpDue,
      secondFollowUpDue,
      needHumanReply,
    },
    riskFlags: {
      missingPhone: missingAnyPhone,
      needMoreInfo,
      rejected,
      skipped,
      needHumanReply,
    },
    adLeads: {
      trialRequestsToday,
      pendingAdLeads,
      approvedAdLeads,
      rejectedAdLeads,
    },
  };
}
