import Link from "next/link";
import {
  getFilteredMessageLeads,
  type FilteredMessageLeadRow,
} from "@/getFilteredMessageLeads";
import { getTodayActionQueue } from "@/getTodayActionQueue";
import type {
  TodayActionLeadRow,
  TodayActionQueueResult,
} from "@/getTodayActionQueue";
import {
  parseQueueAngleParam,
  parseReviewMaxParam,
  queueListExtraWhere,
  type QueueAngleParam,
} from "@/queueListFilter";
import { prisma } from "@/lib/prisma";
import { queuesPath } from "@/queuesUrl";
import {
  normalizePhoneDigits,
  searchLeadsByPhone,
  type PhoneSearchLeadRow,
} from "@/searchLeadsByPhone";
import {
  getLeadReviewInbox,
  type LeadReviewInboxRow,
  type LeadReviewInboxResult,
} from "@/getLeadReviewInbox";
import { leadReviewStatusLabel } from "@/leadReviewStatus";
import { getDailyActivity } from "@/getDailyActivity";
import { getBatchSafetySummary } from "@/getBatchSafetySummary";
import {
  isFirstOutreachActionKey,
  parseFirstOutreachBatchParam,
} from "@/batchQueueParams";
import { doNotContactReasonLabel } from "@/doNotContact";
import {
  formatDateTimeMYT,
  parseActivityDateParam,
} from "@/formatMalaysiaTime";
import { DailyActivitySection } from "./DailyActivitySection";
import { BatchSafetySection } from "./BatchSafetySection";
import { BatchSizeSelector } from "./BatchSizeSelector";
import { PhoneSearchForm } from "./PhoneSearchForm";
import { QueueLimitSelector } from "./QueueLimitSelector";
import { QueueSection } from "./QueueSection";
import { QueuesFilterBar } from "./QueuesFilterBar";
import { MarkFollowUpSentButton } from "./MarkFollowUpSentButton";
import { RejectLeadReviewButton } from "./RejectLeadReviewButton";

export const dynamic = "force-dynamic";

function resolveQueueDisplayLimit(
  raw: string | string[] | undefined,
): 10 | 20 | 50 {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === "") return 10;
  const n = Number.parseInt(String(v), 10);
  if (n === 20 || n === 50) return n;
  return 10;
}

function resolvePhoneQuery(
  raw: string | string[] | undefined,
): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === "") return "";
  return String(v).trim();
}

function fmtText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

function fmtDate(d: Date | null): string {
  return formatDateTimeMYT(d);
}

type QueueAngleProps = {
  leadLevel: string | null;
  reviewCount: number | null;
  showReviewsSubline?: boolean;
};

function LeadAngleCell({
  leadLevel,
  reviewCount,
  showReviewsSubline = true,
}: QueueAngleProps) {
  const ll = (leadLevel ?? "").trim();
  const isNoWebsite = ll === "No Website";
  const isLowReview = ll === "Low Review";

  return (
    <div className="queue-angle-cell">
      <div className="queue-angle-row">
        <span className="queue-angle-level-text">{fmtText(leadLevel)}</span>
        {isNoWebsite ? (
          <span className="queue-badge queue-badge--no-website">No Website</span>
        ) : null}
        {isLowReview ? (
          <span className="queue-badge queue-badge--low-review">Low Review</span>
        ) : null}
      </div>
      {showReviewsSubline &&
      isLowReview &&
      reviewCount != null ? (
        <div className="queue-angle-reviews">Reviews: {reviewCount}</div>
      ) : null}
    </div>
  );
}

function QueueReviewsCell({
  reviewCount,
  googleRating,
}: {
  reviewCount: number | null;
  googleRating: number | null;
}) {
  let ratingLine: string | null = null;
  if (googleRating != null && !Number.isNaN(googleRating)) {
    const r = googleRating;
    ratingLine = Number.isInteger(r) ? String(r) : r.toFixed(1);
  }

  return (
    <div className="queue-reviews-cell">
      {reviewCount != null ? (
        <div className="queue-angle-reviews">Reviews: {reviewCount}</div>
      ) : (
        <div className="queue-muted">—</div>
      )}
      {ratingLine ? (
        <div className="queue-muted">Rating: {ratingLine}</div>
      ) : null}
    </div>
  );
}

function PhoneLines({
  phone,
  internationalPhone,
  whatsappPhone,
}: {
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone?: string | null;
}) {
  return (
    <>
      {whatsappPhone ? (
        <>
          <span className="phone-search-whatsapp">WhatsApp: {fmtText(whatsappPhone)}</span>
          <br />
        </>
      ) : null}
      {fmtText(phone)}
      {internationalPhone ? (
        <>
          <br />
          <span className="phone-search-intl">{fmtText(internationalPhone)}</span>
        </>
      ) : null}
    </>
  );
}

const ACTION_SECTIONS: { key: keyof TodayActionQueueResult; title: string }[] = [
  { key: "prepareFirstMessage", title: "Prepare First Message" },
  { key: "sendPreparedMessage", title: "Send Prepared Message" },
  { key: "firstFollowUpDue", title: "First Follow-up Due" },
  { key: "secondFollowUpDue", title: "Second Follow-up Due" },
  { key: "needHumanReply", title: "Need Human Reply" },
];

function ActionQueueTable({
  leads,
  markFollowUp,
}: {
  leads: TodayActionLeadRow[];
  markFollowUp?: 1 | 2;
}) {
  return (
    <div className="table-wrap queue-work-table-wrap">
      <table className="queue queue-work-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Lead Angle</th>
            <th>Reviews</th>
            <th>Message status</th>
            <th>Reply status</th>
            <th className="queue-th-wrap">
              Next
              <br />
              follow-up
            </th>
            <th>Next Action</th>
            <th></th>
            {markFollowUp ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td className="queue-td-clip">{fmtText(row.businessName)}</td>
              <td className="queue-td-phone">
                <PhoneLines
                  phone={row.phone}
                  internationalPhone={row.internationalPhone}
                />
              </td>
              <td>{fmtText(row.area)}</td>
              <td>
                <LeadAngleCell
                  leadLevel={row.leadLevel}
                  reviewCount={row.reviewCount}
                />
              </td>
              <td>
                <QueueReviewsCell
                  reviewCount={row.reviewCount}
                  googleRating={row.googleRating}
                />
              </td>
              <td>{fmtText(row.messageStatus)}</td>
              <td>{fmtText(row.replyStatus)}</td>
              <td>{fmtDate(row.nextFollowUpAt)}</td>
              <td className="queue-td-clip">{fmtText(row.nextAction)}</td>
              <td>
                <Link href={`/leads/${row.id}`}>View</Link>
              </td>
              {markFollowUp ? (
                <td className="queue-td-action">
                  <MarkFollowUpSentButton leadId={row.id} which={markFollowUp} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhoneSearchResultsTable({ leads }: { leads: PhoneSearchLeadRow[] }) {
  return (
    <div className="table-wrap phone-search-results queue-work-table-wrap">
      <table className="queue queue-work-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Lead Angle</th>
            <th>Reviews</th>
            <th>Message status</th>
            <th>Reply status</th>
            <th>Contact status</th>
            <th className="queue-th-wrap">
              Next
              <br />
              follow-up
            </th>
            <th className="queue-th-wrap">
              Next
              <br />
              check
            </th>
            <th>Note / remark</th>
            <th>Next Action</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td className="queue-td-clip">{fmtText(row.businessName)}</td>
              <td className="queue-td-phone">
                <PhoneLines
                  phone={row.phone}
                  internationalPhone={row.internationalPhone}
                  whatsappPhone={row.whatsappPhone}
                />
              </td>
              <td>{fmtText(row.area)}</td>
              <td>
                <LeadAngleCell
                  leadLevel={row.leadLevel}
                  reviewCount={row.reviewCount}
                  showReviewsSubline={false}
                />
              </td>
              <td>
                <QueueReviewsCell
                  reviewCount={row.reviewCount}
                  googleRating={row.googleRating}
                />
              </td>
              <td>{fmtText(row.messageStatus)}</td>
              <td>{fmtText(row.replyStatus)}</td>
              <td>
                {fmtText(row.contactStatus)}
                {doNotContactReasonLabel(row) ? (
                  <div className="dnc-lookup-warning">
                    Do Not Contact: {doNotContactReasonLabel(row)}
                  </div>
                ) : null}
              </td>
              <td>{fmtDate(row.nextFollowUpAt)}</td>
              <td>{fmtDate(row.nextCheckAt)}</td>
              <td className="queue-td-clip">
                {fmtText(
                  row.handoffReason ??
                    row.replyNotes ??
                    row.manualNotes ??
                    row.conversationSummary ??
                    row.lastInboundMessage,
                )}
              </td>
              <td className="queue-td-clip">{fmtText(row.nextAction)}</td>
              <td>
                <Link href={`/leads/${row.id}`}>Open Lead</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadReviewInboxTable({
  leads,
  showReject = false,
}: {
  leads: LeadReviewInboxRow[];
  showReject?: boolean;
}) {
  return (
    <div className="table-wrap queue-work-table-wrap">
      <table className="queue queue-work-table lead-review-inbox-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Phone</th>
            <th>Area / Source</th>
            <th>Reviews</th>
            <th>Review status</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td className="queue-td-clip">{fmtText(row.businessName)}</td>
              <td className="queue-td-phone">
                <PhoneLines
                  phone={row.phone}
                  internationalPhone={row.internationalPhone}
                  whatsappPhone={row.whatsappPhone}
                />
              </td>
              <td className="queue-td-clip">
                {fmtText(row.area)}
                {row.sourceKeyword ? (
                  <>
                    <br />
                    <span className="queue-muted">{row.sourceKeyword}</span>
                  </>
                ) : null}
              </td>
              <td>
                <QueueReviewsCell
                  reviewCount={row.reviewCount}
                  googleRating={row.googleRating}
                />
              </td>
              <td>{leadReviewStatusLabel(row.outreachReadiness)}</td>
              <td className="queue-td-clip">{fmtText(row.manualNotes)}</td>
              <td className="lead-review-inbox-actions">
                <Link href={`/leads/${row.id}`}>Review Lead</Link>
                {showReject ? (
                  <RejectLeadReviewButton
                    leadId={row.id}
                    manualNotes={row.manualNotes}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadReviewInboxSection({
  inbox,
}: {
  inbox: LeadReviewInboxResult;
}) {
  const hasVisibleLeads =
    inbox.needsReview.count > 0 || inbox.needMoreInfo.count > 0;

  return (
    <div className="section lead-review-inbox-section">
      <h2>Lead Review Inbox</h2>
      <p className="sub">
        Review imported leads before sending WhatsApp outreach.
      </p>

      {!hasVisibleLeads ? (
        <p className="empty">No leads waiting for review.</p>
      ) : null}

      {inbox.needsReview.count > 0 ? (
        <div className="group">
          <QueueSection
            title="Unreviewed / Needs Review"
            totalCount={inbox.needsReview.count}
            shownCount={inbox.needsReview.leads.length}
            defaultExpanded
          >
            <LeadReviewInboxTable
              leads={inbox.needsReview.leads}
              showReject
            />
          </QueueSection>
        </div>
      ) : null}

      {inbox.needMoreInfo.count > 0 ? (
        <div className="group">
          <QueueSection
            title="Need More Info"
            totalCount={inbox.needMoreInfo.count}
            shownCount={inbox.needMoreInfo.leads.length}
            defaultExpanded
          >
            <LeadReviewInboxTable leads={inbox.needMoreInfo.leads} />
          </QueueSection>
        </div>
      ) : null}

      {inbox.rejected.count > 0 ? (
        <div className="group">
          <QueueSection
            title="Rejected / Not Suitable"
            totalCount={inbox.rejected.count}
            shownCount={inbox.rejected.leads.length}
            defaultExpanded={false}
          >
            <LeadReviewInboxTable leads={inbox.rejected.leads} />
          </QueueSection>
        </div>
      ) : null}
    </div>
  );
}

function fmtReviewShort(
  reviewCount: number | null,
  googleRating: number | null,
): string {
  if (reviewCount == null) return "—";
  if (googleRating != null && !Number.isNaN(googleRating)) {
    const r = googleRating;
    const line = Number.isInteger(r) ? String(r) : r.toFixed(1);
    return `${reviewCount} (${line})`;
  }
  return String(reviewCount);
}

function FilteredMessageLeadsTable({
  leads,
}: {
  leads: FilteredMessageLeadRow[];
}) {
  return (
    <div className="table-wrap queue-work-table-wrap">
      <table className="queue queue-work-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Phone</th>
            <th>Website</th>
            <th>Reviews</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td className="queue-td-clip">{fmtText(row.businessName)}</td>
              <td className="queue-td-phone">
                <PhoneLines
                  phone={row.phone}
                  internationalPhone={row.internationalPhone}
                />
              </td>
              <td className="queue-td-clip">{fmtText(row.website)}</td>
              <td>{fmtReviewShort(row.reviewCount, row.googleRating)}</td>
              <td className="queue-td-clip">
                {fmtText(row.messageStatus)}
                {row.replyStatus ? ` · ${row.replyStatus}` : ""}
              </td>
              <td>
                <Link href={`/leads/${row.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function QueuesPage({
  searchParams,
}: {
  searchParams: Promise<{
    limit?: string | string[];
    phone?: string | string[];
    angle?: string | string[];
    reviewMax?: string | string[];
    activityDate?: string | string[];
    batch?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const limit = resolveQueueDisplayLimit(sp.limit);
  const firstOutreachBatch = parseFirstOutreachBatchParam(sp.batch);
  const activityDate = parseActivityDateParam(sp.activityDate);
  const phoneQuery = resolvePhoneQuery(sp.phone);
  const phoneDigits = normalizePhoneDigits(phoneQuery);
  const hasPhoneQuery = phoneQuery.length > 0;
  const phoneSearchOk = hasPhoneQuery && phoneDigits.length >= 4;

  const angle: QueueAngleParam = parseQueueAngleParam(sp.angle);
  const reviewMax = parseReviewMaxParam(sp.reviewMax);
  const listExtraWhere = queueListExtraWhere(angle, reviewMax);

  const isFilteredMode =
    angle !== "all" ||
    reviewMax !== undefined;

  let filteredLeads: FilteredMessageLeadRow[] | null = null;
  let actionQueue: TodayActionQueueResult | null = null;
  let phoneSearchRows: PhoneSearchLeadRow[] = [];
  let leadReviewInbox: LeadReviewInboxResult;

  const phoneSearchPromise = phoneSearchOk
    ? searchLeadsByPhone(prisma, phoneQuery, { limit })
    : Promise.resolve([] as PhoneSearchLeadRow[]);

  const dailyActivityPromise = getDailyActivity(prisma, activityDate);
  const batchSafetyPromise = getBatchSafetySummary(prisma, firstOutreachBatch);
  const leadReviewInboxPromise = getLeadReviewInbox(prisma, { limit });

  let dailyActivity: Awaited<ReturnType<typeof getDailyActivity>>;
  let batchSafety: Awaited<ReturnType<typeof getBatchSafetySummary>>;

  if (isFilteredMode) {
    [filteredLeads, phoneSearchRows, dailyActivity, batchSafety, leadReviewInbox] =
      await Promise.all([
      getFilteredMessageLeads(prisma, {
        limit,
        listExtraWhere,
      }),
      phoneSearchPromise,
      dailyActivityPromise,
      batchSafetyPromise,
      leadReviewInboxPromise,
    ]);
  } else {
    const [aq, ps, da, bs, lri] = await Promise.all([
      getTodayActionQueue(prisma, {
        limit,
        firstOutreachBatchLimit: firstOutreachBatch,
        listExtraWhere,
      }),
      phoneSearchPromise,
      dailyActivityPromise,
      batchSafetyPromise,
      leadReviewInboxPromise,
    ]);
    actionQueue = aq;
    phoneSearchRows = ps;
    dailyActivity = da;
    batchSafety = bs;
    leadReviewInbox = lri;
  }

  return (
    <div className="page queues-work-page">
      <p className="top-links">
        <Link className="top-link" href="/">
          Home
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/import">
          Import Excel
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/message-templates">
          Message Templates
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/review-trials">
          Review Trials
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/reply-sop">
          Reply SOP Settings
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/system-health">
          System Health
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/ad-apply-links">
          Ad Apply Links
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/landing-pages">
          Landing Pages
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/ad-leads">
          Ad Leads
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/agent-leads">
          AI Leads
        </Link>
      </p>
      <h1>Queues</h1>
      <p className="sub">
        {isFilteredMode
          ? "Filtered Message Queue: one compact list of queue-eligible leads. Follow-up Queue is hidden until you clear filters. Phone lookup remains global. Read-only — no writes."
          : "Today’s Action Queue: only leads that need action now. Phone lookup searches all leads independently. Read-only — no writes."}
      </p>

      <DailyActivitySection
        activity={dailyActivity}
        preserve={{
          limit,
          phone: phoneQuery,
          angle,
          reviewMax,
          activityDate,
          batch: firstOutreachBatch,
        }}
      />

      <BatchSafetySection summary={batchSafety} />

      <div className="queues-toolbar">
        <PhoneSearchForm
          currentLimit={limit}
          initialPhone={phoneQuery}
          currentAngle={angle}
          reviewMax={reviewMax}
          activityDate={activityDate}
          batch={firstOutreachBatch}
        />
        <QueueLimitSelector
          currentLimit={limit}
          currentPhone={phoneQuery}
          currentAngle={angle}
          reviewMax={reviewMax}
          activityDate={activityDate}
          batch={firstOutreachBatch}
        />
        <BatchSizeSelector
          currentBatch={firstOutreachBatch}
          currentLimit={limit}
          currentPhone={phoneQuery}
          currentAngle={angle}
          reviewMax={reviewMax}
          activityDate={activityDate}
        />
      </div>

      {hasPhoneQuery && !phoneSearchOk ? (
        <p className="empty">Enter at least 4 digits to search.</p>
      ) : null}

      {hasPhoneQuery && phoneSearchOk ? (
        <div className="section phone-search-results-section">
          <h2>Phone Lookup Results</h2>
          <p className="sub phone-search-results-note">
            Global lookup across all leads. These results do not change the queue
            below.
          </p>
          {phoneSearchRows.length === 0 ? (
            <p className="empty">No leads found for this phone number.</p>
          ) : (
            <PhoneSearchResultsTable leads={phoneSearchRows} />
          )}
        </div>
      ) : null}

      {isFilteredMode && filteredLeads ? (
        <div className="section message-queue-work-section">
          <p className="phone-search-clear-wrap">
            <Link className="top-link" href={queuesPath({ limit, batch: firstOutreachBatch })} prefetch={false}>
              Clear filters — full Queues
            </Link>
          </p>
          <QueuesFilterBar
            limit={limit}
            phone={phoneQuery}
            angle={angle}
            reviewMax={reviewMax}
            activityDate={activityDate}
            batch={firstOutreachBatch}
          />
          <h2>Filtered Message Leads</h2>
          <p className="sub">
            Showing up to {limit} leads not yet first-sent (Not Prepared or Prepared
            only), with angle / reviews filters.
          </p>
          {filteredLeads.length === 0 ? (
            <p className="empty">No leads match these filters.</p>
          ) : (
            <FilteredMessageLeadsTable leads={filteredLeads} />
          )}
        </div>
      ) : null}

      {!isFilteredMode && actionQueue ? (
        <>
          <LeadReviewInboxSection inbox={leadReviewInbox} />

          <div className="section message-queue-work-section">
            <QueuesFilterBar
              limit={limit}
              phone={phoneQuery}
              angle={angle}
              reviewMax={reviewMax}
              activityDate={activityDate}
              batch={firstOutreachBatch}
            />
            <h2>Today&apos;s Action Queue</h2>
            <p className="sub queue-batch-scope-note">
              Only first outreach is batch-limited. Follow-ups and human replies stay
              visible.
            </p>
            {ACTION_SECTIONS.map(({ key, title }) => {
              const group = actionQueue[key];
              const isFirstOutreach = isFirstOutreachActionKey(key);
              const markFollowUp =
                key === "firstFollowUpDue"
                  ? 1
                  : key === "secondFollowUpDue"
                    ? 2
                    : undefined;
              return (
                <div className="group" key={key}>
                  <QueueSection
                    key={`action-${String(key)}-${limit}-${firstOutreachBatch}-${angle}-${reviewMax ?? "x"}`}
                    title={title}
                    totalCount={group.count}
                    shownCount={group.leads.length}
                    defaultExpanded={group.count > 0}
                  >
                    {isFirstOutreach && group.leads.length > 0 ? (
                      <p className="sub queue-batch-section-note">
                        Showing first {group.leads.length} leads in this batch.
                      </p>
                    ) : null}
                    {group.leads.length === 0 ? (
                      <p className="empty">No leads</p>
                    ) : (
                      <ActionQueueTable
                        leads={group.leads}
                        markFollowUp={markFollowUp}
                      />
                    )}
                  </QueueSection>
                </div>
              );
            })}
          </div>

          <div className="section skipped-leads-cta-section">
            <h2>Skipped Leads</h2>
            <p className="sub">
              Skipped leads are hidden from Today&apos;s Action Queue.
            </p>
            <Link className="import-preview-btn" href={`/skipped-leads?limit=${limit}`}>
              Open Skipped Leads
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

