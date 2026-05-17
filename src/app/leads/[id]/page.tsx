import Link from "next/link";
import type { ReactNode } from "react";
import { PreparedMessageWorkspace } from "./PreparedMessageWorkspace";
import { ReplyOutcomeForm } from "./ReplyOutcomeForm";
import { ReviewTrialForm } from "./ReviewTrialForm";
import { RestoreLeadButton } from "./RestoreLeadButton";
import { SkipLeadPanel } from "./SkipLeadPanel";
import { prisma } from "@/lib/prisma";
import { skipReasonLabel } from "@/skipLeadReasons";
import {
  MESSAGE_STATUS_FIRST_SENT,
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
} from "@/statusConstants";

const PREPARE_BLOCKED_HINT =
  "This lead cannot be prepared from the current status.";

const PREPARE_SKIPPED_HINT =
  "Skipped from Message Queue. Use Restore below to return this lead to the Message Queue.";

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

function computeCanMarkSent(lead: {
  isArchived: boolean;
  skippedAt: Date | null;
  messageStatus: string;
  preparedTrimLength: number;
}): boolean {
  if (lead.isArchived) return false;
  if (lead.skippedAt) return false;
  if (lead.messageStatus !== MESSAGE_STATUS_PREPARED) return false;
  if (lead.preparedTrimLength === 0) return false;
  return true;
}

function computeCanPrepare(lead: {
  isArchived: boolean;
  skippedAt: Date | null;
  messageStatus: string;
  replyStatus: string | null;
  handoffRequired: boolean;
}): boolean {
  if (lead.isArchived) return false;
  if (lead.skippedAt) return false;
  if (lead.replyStatus === "Replied" || lead.replyStatus === "Stopped") {
    return false;
  }
  if (lead.handoffRequired) return false;
  if (
    lead.messageStatus !== MESSAGE_STATUS_NOT_PREPARED &&
    lead.messageStatus !== MESSAGE_STATUS_PREPARED
  ) {
    return false;
  }
  return true;
}

export const dynamic = "force-dynamic";

function fmtText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 19);
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

function BackToQueues({ leadId }: { leadId?: string }) {
  return (
    <p className="top-links">
      <Link className="top-link" href="/queues">
        ← Back to queues
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
      phone: true,
      internationalPhone: true,
      website: true,
      socialPlatform: true,
      socialLink: true,
      googleMapsLink: true,
      isArchived: true,
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
      preparedMessage: true,
      googleCategory: true,
      googleRating: true,
      reviewCount: true,
      sourceKeyword: true,
      reviewTrialStatus: true,
      reviewTrialStartAt: true,
      reviewTrialEndAt: true,
      reviewPublicUrl: true,
      reviewMerchantUrl: true,
      reviewTrialNotes: true,
      campaign: {
        select: { name: true, sourceKeyword: true },
      },
      importBatch: {
        select: { filename: true },
      },
      skippedAt: true,
      skipReason: true,
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
  const reviewTrialDaysText = (() => {
    if (!lead.reviewTrialEndAt) return "—";
    const today = new Date();
    const todayDateOnly = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const end = Date.UTC(
      lead.reviewTrialEndAt.getUTCFullYear(),
      lead.reviewTrialEndAt.getUTCMonth(),
      lead.reviewTrialEndAt.getUTCDate(),
    );
    const diffDays = Math.round((end - todayDateOnly) / 86_400_000);
    if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
    if (diffDays === 0) return "Ends today";
    const expiredDays = Math.abs(diffDays);
    return `Expired ${expiredDays} day${expiredDays === 1 ? "" : "s"} ago`;
  })();

  const canPrepare = computeCanPrepare({
    isArchived: lead.isArchived,
    skippedAt: lead.skippedAt,
    messageStatus: lead.messageStatus,
    replyStatus: lead.replyStatus,
    handoffRequired: lead.handoffRequired,
  });

  const prepareReasonHint =
    lead.skippedAt && !lead.isArchived ? PREPARE_SKIPPED_HINT : PREPARE_BLOCKED_HINT;

  const canMarkSent = computeCanMarkSent({
    isArchived: lead.isArchived,
    skippedAt: lead.skippedAt,
    messageStatus: lead.messageStatus,
    preparedTrimLength: prepared.length,
  });

  const canRecordReply = computeCanRecordReply({
    isArchived: lead.isArchived,
    messageStatus: lead.messageStatus,
  });

  return (
    <div className="page lead-detail">
      <BackToQueues leadId={id} />

      <header className="lead-header">
        <h1>{fmtText(lead.businessName)}</h1>
        <p className="sub">Lead follow-up workspace</p>
      </header>

      <section className="detail-card follow-up-summary-card">
        <h2>Follow-up Summary</h2>
        <div className="kv-list">
          <Row label="Message Status">{fmtText(lead.messageStatus)}</Row>
          <Row label="Reply Status">{fmtText(lead.replyStatus)}</Row>
          <Row label="Contact Status">{fmtText(lead.contactStatus)}</Row>
          <Row label="Lead Temperature">{fmtText(lead.leadTemperature)}</Row>
          <Row label="Next Action">{fmtText(lead.nextAction)}</Row>
          <Row label="Handoff Required">{fmtBool(lead.handoffRequired)}</Row>
          <Row label="Next Check At">{fmtDate(lead.nextCheckAt)}</Row>
          <Row label="Next Follow-up At">{fmtDate(lead.nextFollowUpAt)}</Row>
        </div>
      </section>

      <section className="detail-card">
        <h2>Contact</h2>
        <div className="kv-list">
          <Row label="Phone">{fmtText(lead.phone)}</Row>
          <Row label="International Phone">{fmtText(lead.internationalPhone)}</Row>
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

      {lead.skippedAt ? (
        <section className="detail-card skipped-lead-banner">
          <h2>Skipped from Message Queue</h2>
          <p className="sub">
            Reason: <strong>{skipReasonLabel(lead.skipReason)}</strong>
            <br />
            Skipped at: {fmtDate(lead.skippedAt)}
          </p>
          <RestoreLeadButton leadId={id} />
        </section>
      ) : null}

      {!lead.isArchived && !lead.skippedAt ? (
        <section className="detail-card skip-lead-card">
          <SkipLeadPanel leadId={id} />
        </section>
      ) : null}

      <section className="detail-card message-workspace-card">
        <h2>Message Workspace</h2>
        <PreparedMessageWorkspace
          leadId={id}
          initialPreparedMessage={lead.preparedMessage}
          phone={lead.phone}
          internationalPhone={lead.internationalPhone}
          canPrepare={canPrepare}
          prepareReason={prepareReasonHint}
          canMarkSent={canMarkSent}
          markSentReason={MARK_SENT_HINT}
        />
      </section>

      <section className="detail-card">
        <h2>Reply outcome</h2>
        <ReplyOutcomeForm
          leadId={id}
          canRecordReply={canRecordReply}
          reason={REPLY_FORM_HINT}
        />
      </section>

      <section className="detail-card review-trial-card">
        <h2>Review Trial</h2>
        <div className="kv-list review-trial-summary">
          <Row label="Current Status">{fmtText(lead.reviewTrialStatus)}</Row>
          <Row label="Trial Start Date">{fmtDateOnly(lead.reviewTrialStartAt)}</Row>
          <Row label="Trial End Date">{fmtDateOnly(lead.reviewTrialEndAt)}</Row>
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
          status={lead.reviewTrialStatus}
          startDate={lead.reviewTrialStartAt ? lead.reviewTrialStartAt.toISOString().slice(0, 10) : ""}
          endDate={lead.reviewTrialEndAt ? lead.reviewTrialEndAt.toISOString().slice(0, 10) : ""}
          publicUrl={lead.reviewPublicUrl}
          merchantUrl={lead.reviewMerchantUrl}
          notes={lead.reviewTrialNotes}
        />
      </section>

      <section className="detail-card">
        <h2>Profile</h2>
        <div className="kv-list">
          <Row label="Area">{fmtText(lead.area)}</Row>
          <Row label="Assigned Industry">{fmtText(lead.assignedIndustry)}</Row>
          <Row label="Lead Level">{fmtText(lead.leadLevel)}</Row>
          <Row label="Outreach Readiness">{fmtText(lead.outreachReadiness)}</Row>
          <Row label="Lead Temperature">{fmtText(lead.leadTemperature)}</Row>
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
          <Row label="Next Check At">{fmtDate(lead.nextCheckAt)}</Row>
          <Row label="Next Follow-up At">{fmtDate(lead.nextFollowUpAt)}</Row>
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
    </div>
  );
}
