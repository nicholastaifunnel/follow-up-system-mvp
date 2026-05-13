import Link from "next/link";
import type { ReactNode } from "react";
import { CopyMessageButton } from "./CopyMessageButton";
import { PrepareMessageButton } from "./PrepareMessageButton";
import { prisma } from "@/lib/prisma";
import {
  MESSAGE_STATUS_NOT_PREPARED,
  MESSAGE_STATUS_PREPARED,
} from "@/statusConstants";

const PREPARE_BLOCKED_HINT =
  "This lead cannot be prepared from the current status.";

function computeCanPrepare(lead: {
  isArchived: boolean;
  messageStatus: string;
  replyStatus: string | null;
  handoffRequired: boolean;
}): boolean {
  if (lead.isArchived) return false;
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

function fmtBool(v: boolean): string {
  return v ? "Yes" : "No";
}

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function BackToQueues() {
  return (
    <p className="top-link">
      <Link href="/queues">← Back to queues</Link>
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
      campaign: {
        select: { name: true, sourceKeyword: true },
      },
      importBatch: {
        select: { filename: true },
      },
    },
  });

  if (!lead) {
    return (
      <div className="page lead-detail">
        <BackToQueues />
        <h1>Lead not found</h1>
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

  const canPrepare = computeCanPrepare({
    isArchived: lead.isArchived,
    messageStatus: lead.messageStatus,
    replyStatus: lead.replyStatus,
    handoffRequired: lead.handoffRequired,
  });

  return (
    <div className="page lead-detail">
      <BackToQueues />

      <header className="lead-header">
        <h1>{fmtText(lead.businessName)}</h1>
        <p className="sub">Lead detail — read-only</p>
      </header>

      <section className="detail-card">
        <h2>Header</h2>
        <div className="kv-list">
          <Row label="Area">{fmtText(lead.area)}</Row>
          <Row label="Assigned Industry">{fmtText(lead.assignedIndustry)}</Row>
          <Row label="Lead Level">{fmtText(lead.leadLevel)}</Row>
          <Row label="Outreach Readiness">{fmtText(lead.outreachReadiness)}</Row>
          <Row label="Lead Temperature">{fmtText(lead.leadTemperature)}</Row>
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

      <section className="detail-card">
        <h2>Status</h2>
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

      <section className="detail-card">
        <h2>Message</h2>
        <div className="message-actions">
          <PrepareMessageButton
            leadId={id}
            canPrepare={canPrepare}
            reason={PREPARE_BLOCKED_HINT}
          />
          {prepared.length > 0 ? (
            <CopyMessageButton text={lead.preparedMessage ?? ""} />
          ) : null}
        </div>
        {prepared.length === 0 ? (
          <p className="empty">No prepared message yet</p>
        ) : (
          <div className="message-box">
            <pre>{lead.preparedMessage}</pre>
          </div>
        )}
      </section>
    </div>
  );
}
