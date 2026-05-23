import Link from "next/link";
import type { ReactNode } from "react";
import { PreparedMessageWorkspace } from "./PreparedMessageWorkspace";
import { ReplyOutcomeForm } from "./ReplyOutcomeForm";
import { PlanUsageHistory } from "./PlanUsageHistory";
import { ReviewTrialForm } from "./ReviewTrialForm";
import { LeadReviewForm } from "./LeadReviewForm";
import { DoNotContactForm } from "./DoNotContactForm";
import { RestoreLeadButton } from "./RestoreLeadButton";
import { SkipLeadPanel } from "./SkipLeadPanel";
import { WhatsAppPhoneForm } from "./WhatsAppPhoneForm";
import { prisma } from "@/lib/prisma";
import { skipReasonLabel } from "@/skipLeadReasons";
import {
  computeReviewPlanDisplayStatus,
  formatReviewTrialDaysLeft,
  getReviewPlanFollowUpState,
  resolveReviewPlanType,
  reviewTrialStatusBadgeClass,
} from "@/reviewPlanFollowUp";
import { formatDateOnlyMYT, formatDateTimeMYT } from "@/formatMalaysiaTime";
import { formatRmFromCents } from "@/money";
import { summarizePlanUsage } from "@/reviewPlanUsage";
import { MESSAGE_STATUS_FIRST_SENT } from "@/statusConstants";
import {
  computeMessageWorkspaceState,
  scheduledFollowUpNote,
} from "./messageWorkspaceState";
import { canEnterFirstOutreach } from "@/leadReviewStatus";
import {
  isDoNotContactLead,
} from "@/doNotContact";

const MARK_SENT_HINT =
  "Mark sent is available after a message is prepared.";

const REPLY_FORM_HINT =
  "Reply outcome is available after the first message is sent.";

function computeCanRecordReply(lead: {
  isArchived: boolean;
  messageStatus: string;
}): boolean {
  if (lead.isArchived) return false;
  return lead.messageStatus === MESSAGE_STATUS_FIRST_SENT;
}

export const dynamic = "force-dynamic";

function fmtText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

function fmtDateOnly(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function fmtBool(v: boolean): string {
  return v ? "Yes" : "No";
}

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function BackToQueues({
  leadId,
  isReviewCustomer = false,
}: {
  leadId?: string;
  isReviewCustomer?: boolean;
}) {
  return (
    <p className="top-links">
      <Link
        className="top-link"
        href={isReviewCustomer ? "/review-trials" : "/queues"}
      >
        {isReviewCustomer ? "← Back to Review Follow-up" : "← Back to queues"}
      </Link>
      {leadId ? (
        <>
          <span className="top-links-sep">·</span>
          <a
            className="top-link"
            href={`/leads/${leadId}/reply-assistant`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Reply Assistant
          </a>
          <span className="top-links-sep">·</span>
          <Link className="top-link" href="/reply-sop">
            Reply SOP Settings
          </Link>
        </>
      ) : null}
    </p>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kv-row">
      <span className="kv-label">{label}</span>
      <span className="kv-value">{children}</span>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      businessName: true,
      area: true,
      assignedIndustry: true,
      leadLevel: true,
      outreachReadiness: true,
      leadTemperature: true,
      manualNotes: true,
      phone: true,
      internationalPhone: true,
      whatsappPhone: true,
      website: true,
      socialPlatform: true,
      socialLink: true,
      googleMapsLink: true,
      isArchived: true,
      archivedReason: true,
      messageStatus: true,
      replyStatus: true,
      replyOutcome: true,
      contactStatus: true,
      botStatus: true,
      handoffRequired: true,
      handoffReason: true,
      nextAction: true,
      nextCheckAt: true,
      nextFollowUpAt: true,
      followUp1SentAt: true,
      followUp2SentAt: true,
      preparedMessage: true,
      googleCategory: true,
      googleRating: true,
      reviewCount: true,
      sourceKeyword: true,
      reviewTrialStatus: true,
      reviewTrialStartAt: true,
      reviewTrialEndAt: true,
      reviewPlanType: true,
      reviewPlanAmountCents: true,
      reviewPlanCurrency: true,
      reviewPublicUrl: true,
      reviewMerchantUrl: true,
      reviewTrialNotes: true,
      reviewTrialCheckInSentAt: true,
      reviewRenewalReminderSentAt: true,
      reviewExpiredReminder1SentAt: true,
      reviewExpiredFollowUp1SentAt: true,
      reviewExpiredFollowUp2SentAt: true,
      reviewTrialCheckInDraft: true,
      reviewRenewalReminderDraft: true,
      reviewExpiredReminder1Draft: true,
      reviewExpiredFollowUp1Draft: true,
      reviewExpiredFollowUp2Draft: true,
      campaign: {
        select: { name: true, sourceKeyword: true },
      },
      importBatch: {
        select: { filename: true },
      },
      skippedAt: true,
      skipReason: true,
      reviewPlanPeriods: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          planType: true,
          startAt: true,
          endAt: true,
          priceCents: true,
          amountCents: true,
          currency: true,
          status: true,
          source: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  });

  if (!lead) {
    return (
      <div className="page lead-detail">
        <BackToQueues />
        <p className="sub">
          No lead exists with id <code>{id}</code>.
        </p>
      </div>
    );
  }

  const campaignName = lead.campaign?.name ?? null;
  const importFilename = lead.importBatch?.filename ?? null;
  const sourceKeywordDisplay =
    lead.sourceKeyword ?? lead.campaign?.sourceKeyword ?? null;

  const prepared = (lead.preparedMessage ?? "").trim();
  const reviewPlanFields = {
    reviewTrialStatus: lead.reviewTrialStatus,
    reviewTrialStartAt: lead.reviewTrialStartAt,
    reviewTrialEndAt: lead.reviewTrialEndAt,
    reviewPlanType: lead.reviewPlanType,
    reviewTrialCheckInSentAt: lead.reviewTrialCheckInSentAt,
    reviewRenewalReminderSentAt: lead.reviewRenewalReminderSentAt,
    reviewExpiredReminder1SentAt: lead.reviewExpiredReminder1SentAt,
    reviewExpiredFollowUp1SentAt: lead.reviewExpiredFollowUp1SentAt,
    reviewExpiredFollowUp2SentAt: lead.reviewExpiredFollowUp2SentAt,
  };
  const reviewTrialDisplayStatus = computeReviewPlanDisplayStatus(reviewPlanFields);
  const reviewFollowUpState = getReviewPlanFollowUpState(reviewPlanFields);
  const reviewFollowUpReason = reviewFollowUpState.nextActionReason;
  const reviewTrialDaysText = formatReviewTrialDaysLeft(lead.reviewTrialEndAt);
  const reviewPlanTypeDisplay = resolveReviewPlanType(reviewPlanFields) ?? "—";
  const planUsageSummary = summarizePlanUsage(lead.reviewPlanPeriods);

  const isReviewCustomer = Boolean(
    lead.reviewPlanType ||
      lead.reviewTrialStartAt ||
      lead.reviewTrialEndAt ||
      lead.reviewTrialStatus ||
      lead.reviewPublicUrl ||
      lead.reviewMerchantUrl,
  );

  const workspace = computeMessageWorkspaceState({
    isArchived: lead.isArchived,
    skippedAt: lead.skippedAt,
    messageStatus: lead.messageStatus,
    replyStatus: lead.replyStatus,
    handoffRequired: lead.handoffRequired,
    followUp1SentAt: lead.followUp1SentAt,
    followUp2SentAt: lead.followUp2SentAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    preparedTrimLength: prepared.length,
  });
  const isDoNotContact = isDoNotContactLead(lead);
  const firstOutreachNeedsApproval =
    workspace.mode === "first-message" &&
    !canEnterFirstOutreach(lead.outreachReadiness);
  const messageWorkspaceState = isDoNotContact
    ? {
        ...workspace,
        mode: "blocked" as const,
        statusNote: "Do Not Contact — this lead is blocked from outreach.",
        canPrepare: false,
        canMarkSent: false,
        markFollowUpWhich: null,
      }
    : firstOutreachNeedsApproval
    ? {
        ...workspace,
        statusNote: "Approve this lead before preparing outreach.",
        canPrepare: false,
        canMarkSent: false,
      }
    : workspace;

  const scheduledNote =
    workspace.mode === "first-follow-up-scheduled"
      ? scheduledFollowUpNote(1, lead.nextFollowUpAt, formatDateTimeMYT)
      : workspace.mode === "second-follow-up-scheduled"
        ? scheduledFollowUpNote(2, lead.nextFollowUpAt, formatDateTimeMYT)
        : null;

  const canRecordReply = computeCanRecordReply({
    isArchived: lead.isArchived,
    messageStatus: lead.messageStatus,
  });

  return (
    <div className="page lead-detail">
      <BackToQueues leadId={id} isReviewCustomer={isReviewCustomer} />

      <header className="lead-header">
        <h1>{fmtText(lead.businessName)}</h1>
        <p className="sub">
          {isReviewCustomer ? "Review plan workspace" : "Lead follow-up workspace"}
        </p>
      </header>

      {isReviewCustomer ? (
        <section className="detail-card review-plan-summary-card">
          <h2>Review Plan Summary</h2>
          <div className="kv-list">
            <Row label="Plan Type">{reviewPlanTypeDisplay}</Row>
            <Row label="Current Status">
              <span className={reviewTrialStatusBadgeClass(reviewTrialDisplayStatus)}>
                {reviewTrialDisplayStatus}
              </span>
            </Row>
            <Row label="Plan End Date">{fmtDateOnly(lead.reviewTrialEndAt)}</Row>
            <Row label="Days Left">{reviewTrialDaysText}</Row>
            <Row label="Next Follow-up">{reviewFollowUpReason}</Row>
            <Row label="Due Date">
              {formatDateOnlyMYT(reviewFollowUpState.nextActionDueDate)}
            </Row>
            <Row label="Total Paid">{planUsageSummary.totalPaidLabel}</Row>
          </div>
        </section>
      ) : (
        <section className="detail-card follow-up-summary-card">
          <h2>Follow-up Summary</h2>
          <div className="kv-list">
            <Row label="Message Status">{fmtText(lead.messageStatus)}</Row>
            <Row label="Reply Status">{fmtText(lead.replyStatus)}</Row>
            <Row label="Contact Status">{fmtText(lead.contactStatus)}</Row>
            <Row label="Lead Temperature">{fmtText(lead.leadTemperature)}</Row>
            <Row label="Next Action">{fmtText(lead.nextAction)}</Row>
            <Row label="Handoff Required">{fmtBool(lead.handoffRequired)}</Row>
            <Row label="Next Check At">{formatDateTimeMYT(lead.nextCheckAt)}</Row>
            <Row label="Next Follow-up At">{formatDateTimeMYT(lead.nextFollowUpAt)}</Row>
          </div>
        </section>
      )}

      <section className="detail-card">
        <h2>Contact</h2>
        <div className="kv-list">
          <Row label="Phone">{fmtText(lead.phone)}</Row>
          <Row label="International Phone">{fmtText(lead.internationalPhone)}</Row>
          <Row label="WhatsApp Phone">
            <WhatsAppPhoneForm
              leadId={id}
              initialWhatsAppPhone={lead.whatsappPhone}
            />
          </Row>
          <Row label="Website">
            {lead.website ? (
              <a href={lead.website} target="_blank" rel="noopener noreferrer">
                {lead.website}
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Social Platform">{fmtText(lead.socialPlatform)}</Row>
          <Row label="Social Link">
            {lead.socialLink ? (
              <a href={lead.socialLink} target="_blank" rel="noopener noreferrer">
                {lead.socialLink}
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Google Maps Link">
            {lead.googleMapsLink ? (
              <a href={lead.googleMapsLink} target="_blank" rel="noopener noreferrer">
                Open in Maps
              </a>
            ) : (
              "—"
            )}
          </Row>
        </div>
      </section>

      {!isReviewCustomer ? (
        <section className="detail-card lead-review-card">
          <h2>Lead Review</h2>
          <p className="sub">
            Check this lead before sending WhatsApp. Only approved leads appear
            in Today&apos;s Action Queue.
          </p>
          <LeadReviewForm
            leadId={id}
            currentStatus={lead.outreachReadiness}
            initialNotes={lead.manualNotes}
          />
        </section>
      ) : null}

      {!isReviewCustomer ? (
        <section className="detail-card dnc-card">
          <h2>Stop / Do Not Contact</h2>
          <p className="sub">
            Use this when the business should not receive more outreach.
          </p>
          <DoNotContactForm leadId={id} lead={lead} />
        </section>
      ) : null}

      {lead.skippedAt ? (
        <section className="detail-card skipped-lead-banner">
          <h2>Skipped from Message Queue</h2>
          <p className="sub">
            Reason: <strong>{skipReasonLabel(lead.skipReason)}</strong>
            <br />
            Skipped at: {formatDateTimeMYT(lead.skippedAt)}
          </p>
          <RestoreLeadButton leadId={id} />
        </section>
      ) : null}

      {!isReviewCustomer && !lead.isArchived && !lead.skippedAt ? (
        <section className="detail-card skip-lead-card">
          <SkipLeadPanel leadId={id} />
        </section>
      ) : null}

      {!isReviewCustomer ? (
        <section className="detail-card message-workspace-card">
          <h2>Message Workspace</h2>
          <PreparedMessageWorkspace
            leadId={id}
            initialPreparedMessage={lead.preparedMessage}
            phone={lead.phone}
            internationalPhone={lead.internationalPhone}
            whatsappPhone={lead.whatsappPhone}
            workspaceMode={messageWorkspaceState.mode}
            statusNote={messageWorkspaceState.statusNote}
            canPrepare={messageWorkspaceState.canPrepare}
            prepareLabel={messageWorkspaceState.prepareLabel}
            messageStage={messageWorkspaceState.messageStage}
            canMarkSent={messageWorkspaceState.canMarkSent}
            markSentReason={MARK_SENT_HINT}
            markFollowUpWhich={messageWorkspaceState.markFollowUpWhich}
            scheduledNote={scheduledNote}
          />
        </section>
      ) : null}

      {!isReviewCustomer ? (
        <section className="detail-card">
          <h2>Reply outcome</h2>
          <ReplyOutcomeForm
            leadId={id}
            canRecordReply={canRecordReply}
            reason={REPLY_FORM_HINT}
          />
        </section>
      ) : null}

      <section className="detail-card review-trial-card">
        <h2>Review Plan</h2>
        <div className="kv-list review-trial-summary">
          <Row label="Plan Type">{reviewPlanTypeDisplay}</Row>
          <Row label="Plan Price">
            {formatRmFromCents(lead.reviewPlanAmountCents, lead.reviewPlanCurrency)}
          </Row>
          <Row label="Current Status">
            <span className={reviewTrialStatusBadgeClass(reviewTrialDisplayStatus)}>
              {reviewTrialDisplayStatus}
            </span>
          </Row>
          <Row label="Next Follow-up">{reviewFollowUpReason}</Row>
          <Row label="Plan Start Date">{fmtDateOnly(lead.reviewTrialStartAt)}</Row>
          <Row label="Plan End Date">{fmtDateOnly(lead.reviewTrialEndAt)}</Row>
          <Row label="Days Left">{reviewTrialDaysText}</Row>
          <Row label="Public Review Link">
            {lead.reviewPublicUrl ? (
              <a href={lead.reviewPublicUrl} target="_blank" rel="noopener noreferrer">
                Open public link
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Merchant/Admin Link">
            {lead.reviewMerchantUrl ? (
              <a href={lead.reviewMerchantUrl} target="_blank" rel="noopener noreferrer">
                Open admin link
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Notes">{fmtText(lead.reviewTrialNotes)}</Row>
        </div>
        <ReviewTrialForm
          leadId={id}
          displayStatus={reviewTrialDisplayStatus}
          reviewTrialStatus={lead.reviewTrialStatus}
          planType={lead.reviewPlanType}
          planAmountCents={lead.reviewPlanAmountCents}
          startDate={lead.reviewTrialStartAt ? lead.reviewTrialStartAt.toISOString().slice(0, 10) : ""}
          endDate={lead.reviewTrialEndAt ? lead.reviewTrialEndAt.toISOString().slice(0, 10) : ""}
          publicUrl={lead.reviewPublicUrl}
          merchantUrl={lead.reviewMerchantUrl}
          notes={lead.reviewTrialNotes}
          checkInSentAt={
            lead.reviewTrialCheckInSentAt
              ? lead.reviewTrialCheckInSentAt.toISOString()
              : null
          }
          renewalReminderSentAt={
            lead.reviewRenewalReminderSentAt
              ? lead.reviewRenewalReminderSentAt.toISOString()
              : null
          }
          expiredReminder1SentAt={
            lead.reviewExpiredReminder1SentAt
              ? lead.reviewExpiredReminder1SentAt.toISOString()
              : null
          }
          expiredFollowUp1SentAt={
            lead.reviewExpiredFollowUp1SentAt
              ? lead.reviewExpiredFollowUp1SentAt.toISOString()
              : null
          }
          expiredFollowUp2SentAt={
            lead.reviewExpiredFollowUp2SentAt
              ? lead.reviewExpiredFollowUp2SentAt.toISOString()
              : null
          }
          phone={lead.phone}
          internationalPhone={lead.internationalPhone}
          whatsappPhone={lead.whatsappPhone}
          checkInDraft={lead.reviewTrialCheckInDraft}
          renewalDraft={lead.reviewRenewalReminderDraft}
          expiredReminder1Draft={lead.reviewExpiredReminder1Draft}
          expiredFollowUp1Draft={lead.reviewExpiredFollowUp1Draft}
          expiredFollowUp2Draft={lead.reviewExpiredFollowUp2Draft}
        />
      </section>

      <section className="detail-card">
        <h2>Profile</h2>
        <div className="kv-list">
          <Row label="Area">{fmtText(lead.area)}</Row>
          <Row label="Assigned Industry">{fmtText(lead.assignedIndustry)}</Row>
          <Row label="Lead Level">{fmtText(lead.leadLevel)}</Row>
          <Row label="Outreach Readiness">{fmtText(lead.outreachReadiness)}</Row>
          {!isReviewCustomer ? (
            <Row label="Lead Temperature">{fmtText(lead.leadTemperature)}</Row>
          ) : null}
        </div>
      </section>

      <section className="detail-card">
        <h2>Status details</h2>
        <div className="kv-list">
          <Row label="Message Status">{fmtText(lead.messageStatus)}</Row>
          <Row label="Reply Status">{fmtText(lead.replyStatus)}</Row>
          <Row label="Reply Outcome">{fmtText(lead.replyOutcome)}</Row>
          <Row label="Contact Status">{fmtText(lead.contactStatus)}</Row>
          <Row label="Bot Status">{fmtText(lead.botStatus)}</Row>
          <Row label="Handoff Required">{fmtBool(lead.handoffRequired)}</Row>
          <Row label="Handoff Reason">{fmtText(lead.handoffReason)}</Row>
          <Row label="Next Action">{fmtText(lead.nextAction)}</Row>
          <Row label="Next Check At">{formatDateTimeMYT(lead.nextCheckAt)}</Row>
          <Row label="Next Follow-up At">{formatDateTimeMYT(lead.nextFollowUpAt)}</Row>
        </div>
      </section>

      <section className="detail-card">
        <h2>Campaign / Import</h2>
        <div className="kv-list">
          <Row label="Campaign">{fmtText(campaignName)}</Row>
          <Row label="Import batch file">{fmtText(importFilename)}</Row>
          <Row label="Source keyword">{fmtText(sourceKeywordDisplay)}</Row>
          <Row label="Google category">{fmtText(lead.googleCategory)}</Row>
          <Row label="Google rating">{fmtNum(lead.googleRating)}</Row>
          <Row label="Review count">{fmtNum(lead.reviewCount)}</Row>
        </div>
      </section>

      <section className="detail-card plan-usage-history-card">
        <h2>Plan Usage History</h2>
        <PlanUsageHistory periods={lead.reviewPlanPeriods} />
      </section>
    </div>
  );
}
