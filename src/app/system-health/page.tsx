import Link from "next/link";
import { getSystemHealthSummary } from "@/getSystemHealthSummary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MANUAL_TEST_CHECKLIST = [
  "Import a test lead",
  "Approve the lead",
  "Prepare first message",
  "Open WhatsApp with draft",
  "Mark first message sent",
  "Confirm follow-up schedule appears",
  "Mark first follow-up sent",
  "Mark Do Not Contact",
  "Search by phone and confirm warning",
  "Re-import same lead and confirm DNC / review status is not reset",
] as const;

type CountCard = { label: string; value: number; tone?: string };

function CountGrid({ cards, ariaLabel }: { cards: CountCard[]; ariaLabel: string }) {
  return (
    <div className="system-health-overview-grid" role="group" aria-label={ariaLabel}>
      {cards.map(({ label, value, tone }) => (
        <article
          key={label}
          className={
            tone
              ? `system-health-overview-card system-health-overview-card--${tone}`
              : "system-health-overview-card"
          }
        >
          <span className="system-health-overview-label">{label}</span>
          <span className="system-health-overview-count">{value}</span>
        </article>
      ))}
    </div>
  );
}

function FlagList({ items }: { items: { label: string; value: number }[] }) {
  return (
    <ul className="system-health-flag-list">
      {items.map(({ label, value }) => (
        <li key={label} className="system-health-flag-item">
          <span className="system-health-flag-label">{label}</span>
          <span className="system-health-flag-count">{value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function SystemHealthPage() {
  const health = await getSystemHealthSummary(prisma);

  const overviewCards: CountCard[] = [
    { label: "Needs Review", value: health.leadReview.needsReview, tone: "review" },
    {
      label: "Prepare First Message",
      value: health.queueHealth.prepareFirstMessage,
      tone: "prepared",
    },
    {
      label: "Send Prepared Message",
      value: health.queueHealth.sendPreparedMessage,
      tone: "sent",
    },
    {
      label: "Follow-up Due",
      value: health.followUp.followUpDueTotal,
      tone: "followup",
    },
    {
      label: "Need Human",
      value: health.queueHealth.needHumanReply,
      tone: "human",
    },
    { label: "DNC", value: health.safety.doNotContactStopped, tone: "dnc" },
  ];

  const riskFlags = [
    { label: "Missing phone", value: health.riskFlags.missingPhone },
    { label: "Need More Info", value: health.riskFlags.needMoreInfo },
    { label: "Rejected", value: health.riskFlags.rejected },
    { label: "Skipped", value: health.riskFlags.skipped },
    { label: "Need Human Reply", value: health.riskFlags.needHumanReply },
  ];

  const queueHealth = [
    { label: "Prepare First Message", value: health.queueHealth.prepareFirstMessage },
    { label: "Send Prepared Message", value: health.queueHealth.sendPreparedMessage },
    { label: "First Follow-up Due", value: health.queueHealth.firstFollowUpDue },
    { label: "Second Follow-up Due", value: health.queueHealth.secondFollowUpDue },
    { label: "Need Human Reply", value: health.queueHealth.needHumanReply },
  ];

  return (
    <div className="page system-health-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/">
          Home
        </Link>
      </p>

      <h1>System Health</h1>
      <p className="sub system-health-subtitle">
        What needs action now — review, outreach, follow-up, and safety. Read-only —
        no data changes.
      </p>

      <section className="section system-health-section">
        <h2 className="system-health-section-heading">Overview</h2>
        <p className="sub system-health-section-note">
          Action queue counts (matches Today&apos;s Action Queue where noted).
        </p>
        <CountGrid cards={overviewCards} ariaLabel="System health action overview" />
      </section>

      <section className="section system-health-section">
        <h2 className="system-health-section-heading">Risk Flags</h2>
        <p className="sub system-health-section-note">
          These items may need review before outreach.
        </p>
        <FlagList items={riskFlags} />
      </section>

      <section className="section system-health-section">
        <h2 className="system-health-section-heading">Queue Health</h2>
        <p className="sub system-health-section-note">
          Matches Today&apos;s Action Queue counts (active outreach only).
        </p>
        <FlagList items={queueHealth} />
      </section>

      <section className="section system-health-section system-health-checklist-section">
        <h2 className="system-health-section-heading">Manual Production Test Checklist</h2>
        <p className="sub system-health-section-note">
          Run after each deploy. All steps are manual — nothing is sent automatically.
        </p>
        <ol className="system-health-checklist">
          {MANUAL_TEST_CHECKLIST.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <details className="system-health-details">
        <summary className="system-health-details-summary">More counts</summary>
        <div className="system-health-details-body">
          <p className="sub system-health-more-note">
            Reference totals — not all items need action today.
          </p>
          <h3 className="system-health-details-heading">Lead Review</h3>
          <FlagList
            items={[
              { label: "Needs Review", value: health.leadReview.needsReview },
              {
                label: "Approved Total",
                value: health.leadReview.ready,
              },
              { label: "Need More Info", value: health.leadReview.needMoreInfo },
              { label: "Rejected", value: health.leadReview.rejected },
            ]}
          />
          <h3 className="system-health-details-heading">Outreach</h3>
          <FlagList
            items={[
              {
                label: "Not Prepared but Approved",
                value: health.outreach.notPreparedReady,
              },
              { label: "Prepared Not Sent", value: health.outreach.preparedNotSent },
              { label: "First Message Sent", value: health.outreach.firstMessageSent },
              { label: "Sent Today (MYT)", value: health.outreach.sentToday },
            ]}
          />
          <h3 className="system-health-details-heading">Follow-up</h3>
          <FlagList
            items={[
              { label: "First Follow-up Due", value: health.followUp.firstFollowUpDue },
              {
                label: "Second Follow-up Due",
                value: health.followUp.secondFollowUpDue,
              },
              { label: "Need Human Reply", value: health.followUp.needHumanReply },
            ]}
          />
          <h3 className="system-health-details-heading">Safety</h3>
          <FlagList
            items={[
              {
                label: "Do Not Contact / Stopped",
                value: health.safety.doNotContactStopped,
              },
              { label: "Skipped", value: health.safety.skipped },
              { label: "Missing any phone", value: health.safety.missingAnyPhone },
              {
                label: "Manual WhatsApp Phone not added",
                value: health.safety.missingWhatsappPhone,
              },
            ]}
          />
          <p className="sub system-health-more-hint">
            Manual WhatsApp Phone is optional — phone or international phone can still
            be used for outreach.
          </p>
        </div>
      </details>
    </div>
  );
}
