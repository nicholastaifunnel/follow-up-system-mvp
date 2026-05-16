import Link from "next/link";
import { getFollowUpQueue } from "@/getFollowUpQueue";
import type {
  FollowUpQueueLeadRow,
  FollowUpQueueResult,
} from "@/getFollowUpQueue";
import {
  getFilteredMessageLeads,
  type FilteredMessageLeadRow,
} from "@/getFilteredMessageLeads";
import { getMessageQueue } from "@/getMessageQueue";
import type {
  MessageQueueLeadRow,
  MessageQueueResult,
} from "@/getMessageQueue";
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
import { PhoneSearchForm } from "./PhoneSearchForm";
import { QueueLimitSelector } from "./QueueLimitSelector";
import { QueueSection } from "./QueueSection";
import { QueuesFilterBar } from "./QueuesFilterBar";

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
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16);
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
}: {
  phone: string | null;
  internationalPhone: string | null;
}) {
  return (
    <>
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

const MESSAGE_SECTIONS: { key: keyof MessageQueueResult; title: string }[] = [
  { key: "notPrepared", title: "Not Prepared" },
  { key: "preparedNotSent", title: "Prepared Not Sent" },
  { key: "firstMessageSent", title: "First Message Sent" },
  { key: "waitingReply", title: "Waiting Reply" },
  { key: "needHuman", title: "Need Human" },
];

const FOLLOWUP_SECTIONS: { key: keyof FollowUpQueueResult; title: string }[] = [
  { key: "dueToday", title: "Due Today" },
  { key: "overdue", title: "Overdue" },
  { key: "noReplyToCheck", title: "No Reply To Check" },
  { key: "needHuman", title: "Need Human" },
  { key: "followUpLater", title: "Follow Up Later" },
];

function MessageQueueTable({ leads }: { leads: MessageQueueLeadRow[] }) {
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
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td className="queue-td-clip">{fmtText(row.businessName)}</td>
              <td className="queue-td-phone">
                <PhoneLines phone={row.phone} internationalPhone={row.internationalPhone} />
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
            <th className="queue-th-wrap">
              Next
              <br />
              follow-up
            </th>
            <th>Next Action</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td className="queue-td-clip">{fmtText(row.businessName)}</td>
              <td className="queue-td-phone">
                <PhoneLines phone={row.phone} internationalPhone={row.internationalPhone} />
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
              <td>{fmtDate(row.nextFollowUpAt)}</td>
              <td className="queue-td-clip">{fmtText(row.nextAction)}</td>
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

function FollowUpQueueTable({ leads }: { leads: FollowUpQueueLeadRow[] }) {
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
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td className="queue-td-clip">{fmtText(row.businessName)}</td>
              <td className="queue-td-phone">
                <PhoneLines phone={row.phone} internationalPhone={row.internationalPhone} />
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
  }>;
}) {
  const sp = await searchParams;
  const limit = resolveQueueDisplayLimit(sp.limit);
  const phoneQuery = resolvePhoneQuery(sp.phone);
  const phoneDigits = normalizePhoneDigits(phoneQuery);
  const hasPhoneQuery = phoneQuery.length > 0;
  const phoneSearchOk = hasPhoneQuery && phoneDigits.length >= 4;

  const angle: QueueAngleParam = parseQueueAngleParam(sp.angle);
  const reviewMax = parseReviewMaxParam(sp.reviewMax);
  const listExtraWhere = queueListExtraWhere(angle, reviewMax);

  const isFilteredMode =
    angle !== "all" ||
    reviewMax !== undefined ||
    (hasPhoneQuery && phoneSearchOk);

  let filteredLeads: FilteredMessageLeadRow[] | null = null;
  let messageQueue: MessageQueueResult | null = null;
  let followUpQueue: FollowUpQueueResult | null = null;
  let phoneSearchRows: PhoneSearchLeadRow[] = [];

  if (isFilteredMode) {
    filteredLeads = await getFilteredMessageLeads(prisma, {
      limit,
      listExtraWhere,
      phoneQuery: phoneSearchOk ? phoneQuery : undefined,
    });
  } else {
    const [mq, fq, ps] = await Promise.all([
      getMessageQueue(prisma, { limit, listExtraWhere }),
      getFollowUpQueue(prisma, { limit }),
      phoneSearchOk
        ? searchLeadsByPhone(prisma, phoneQuery, { limit, listExtraWhere })
        : Promise.resolve([] as PhoneSearchLeadRow[]),
    ]);
    messageQueue = mq;
    followUpQueue = fq;
    phoneSearchRows = ps;
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
        <Link className="top-link" href="/reply-sop">
          Reply SOP Settings
        </Link>
      </p>
      <h1>Queues</h1>
      <p className="sub">
        {isFilteredMode
          ? "Filtered Message Queue: one compact list of queue-eligible leads. Follow-up Queue is hidden until you clear filters. Read-only — no writes."
          : "Work list: filters only apply to Message Queue. Follow-up Queue always shows all follow-up leads. Phone search uses the same filters to match Message Queue leads. Read-only — no writes."}
      </p>

      <div className="queues-toolbar">
        <PhoneSearchForm
          currentLimit={limit}
          initialPhone={phoneQuery}
          currentAngle={angle}
          reviewMax={reviewMax}
        />
        <QueueLimitSelector
          currentLimit={limit}
          currentPhone={phoneQuery}
          currentAngle={angle}
          reviewMax={reviewMax}
        />
      </div>

      {hasPhoneQuery && !phoneSearchOk ? (
        <p className="empty">Enter at least 4 digits to search.</p>
      ) : null}

      {isFilteredMode && filteredLeads ? (
        <div className="section message-queue-work-section">
          <p className="phone-search-clear-wrap">
            <Link className="top-link" href={queuesPath({ limit })} prefetch={false}>
              Clear filters — full Queues
            </Link>
          </p>
          <QueuesFilterBar
            limit={limit}
            phone={phoneQuery}
            angle={angle}
            reviewMax={reviewMax}
          />
          <h2>Filtered Message Leads</h2>
          <p className="sub">
            Showing up to {limit} leads matching Message Queue rules, angle / reviews /
            phone filters (single query).
          </p>
          {filteredLeads.length === 0 ? (
            <p className="empty">No leads match these filters.</p>
          ) : (
            <FilteredMessageLeadsTable leads={filteredLeads} />
          )}
        </div>
      ) : null}

      {!isFilteredMode && messageQueue && followUpQueue ? (
        <>
          {hasPhoneQuery && phoneSearchOk ? (
            <div className="section phone-search-results-section">
              <h2>Phone Search Results</h2>
              <p className="sub phone-search-results-note">
                Same filters as Message Queue (angle / max reviews). Follow-up Queue is
                unchanged.
              </p>
              {phoneSearchRows.length === 0 ? (
                <p className="empty">
                  No leads found for this phone (with current filters).
                </p>
              ) : (
                <PhoneSearchResultsTable leads={phoneSearchRows} />
              )}
            </div>
          ) : null}

          <div className="section message-queue-work-section">
            <QueuesFilterBar
              limit={limit}
              phone={phoneQuery}
              angle={angle}
              reviewMax={reviewMax}
            />
            <h2>Message Queue</h2>
            {MESSAGE_SECTIONS.map(({ key, title }) => {
              const group = messageQueue[key];
              return (
                <div className="group" key={key}>
                  <QueueSection
                    key={`msg-${String(key)}-${limit}-${angle}-${reviewMax ?? "x"}`}
                    title={title}
                    totalCount={group.count}
                    shownCount={group.leads.length}
                    defaultExpanded={group.count > 0}
                  >
                    {group.leads.length === 0 ? (
                      <p className="empty">No leads</p>
                    ) : (
                      <MessageQueueTable leads={group.leads} />
                    )}
                  </QueueSection>
                </div>
              );
            })}
          </div>

          <div className="section">
            <h2>Follow-up Queue</h2>
            {FOLLOWUP_SECTIONS.map(({ key, title }) => {
              const group = followUpQueue[key];
              return (
                <div className="group" key={key}>
                  <QueueSection
                    key={`fu-${String(key)}-${limit}`}
                    title={title}
                    totalCount={group.count}
                    shownCount={group.leads.length}
                    defaultExpanded={group.count > 0}
                  >
                    {group.leads.length === 0 ? (
                      <p className="empty">No leads</p>
                    ) : (
                      <FollowUpQueueTable leads={group.leads} />
                    )}
                  </QueueSection>
                </div>
              );
            })}
          </div>

          <div className="section skipped-leads-cta-section">
            <h2>Skipped Leads</h2>
            <p className="sub">
              Skipped leads are hidden from Message Queue and Follow-up Queue.
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
