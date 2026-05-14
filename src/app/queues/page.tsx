import Link from "next/link";
import { getFollowUpQueue } from "@/getFollowUpQueue";
import type {
  FollowUpQueueLeadRow,
  FollowUpQueueResult,
} from "@/getFollowUpQueue";
import { getMessageQueue } from "@/getMessageQueue";
import type {
  MessageQueueLeadRow,
  MessageQueueResult,
} from "@/getMessageQueue";
import { prisma } from "@/lib/prisma";
import {
  normalizePhoneDigits,
  searchLeadsByPhone,
  type PhoneSearchLeadRow,
} from "@/searchLeadsByPhone";
import { PhoneSearchForm } from "./PhoneSearchForm";
import { QueueLimitSelector } from "./QueueLimitSelector";
import { QueueSection } from "./QueueSection";

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
  /** When false, omit the “Reviews: n” subline (e.g. phone search uses a dedicated column). */
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

function PhoneReviewsCell({
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
    <div className="queue-phone-reviews-cell">
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

function PhoneWebsiteStatusCell({ website }: { website: string | null }) {
  const has = Boolean((website ?? "").trim());
  return (
    <div className="queue-phone-site-cell">
      <span className={has ? "queue-site-yes" : "queue-site-no"}>
        {has ? "Has site" : "No site"}
      </span>
      {has ? (
        <div className="queue-site-url queue-muted" title={website ?? ""}>
          {(website ?? "").trim().length > 40
            ? `${(website ?? "").trim().slice(0, 37)}…`
            : (website ?? "").trim()}
        </div>
      ) : null}
    </div>
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
    <div className="table-wrap">
      <table className="queue">
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Area</th>
            <th>Industry</th>
            <th>Lead Level</th>
            <th>Message Status</th>
            <th>Reply Status</th>
            <th>Contact Status</th>
            <th>Lead Temperature</th>
            <th>Next Check</th>
            <th>Next Follow-up</th>
            <th>Next Action</th>
            <th>Campaign</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td>{fmtText(row.businessName)}</td>
              <td>{fmtText(row.area)}</td>
              <td>{fmtText(row.assignedIndustry)}</td>
              <td>
                <LeadAngleCell
                  leadLevel={row.leadLevel}
                  reviewCount={row.reviewCount}
                />
              </td>
              <td>{fmtText(row.messageStatus)}</td>
              <td>{fmtText(row.replyStatus)}</td>
              <td>{fmtText(row.contactStatus)}</td>
              <td>—</td>
              <td>{fmtDate(row.nextCheckAt)}</td>
              <td>{fmtDate(row.nextFollowUpAt)}</td>
              <td>—</td>
              <td>{fmtText(row.campaignName)}</td>
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
    <div className="table-wrap phone-search-results">
      <table className="queue">
        <thead>
          <tr>
            <th>Business</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Lead Level</th>
            <th>Reviews</th>
            <th>Website</th>
            <th>Message Status</th>
            <th>Reply Status</th>
            <th>Next Action</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td>{fmtText(row.businessName)}</td>
              <td>
                {fmtText(row.phone)}
                {row.internationalPhone ? (
                  <>
                    <br />
                    <span className="phone-search-intl">{fmtText(row.internationalPhone)}</span>
                  </>
                ) : null}
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
                <PhoneReviewsCell
                  reviewCount={row.reviewCount}
                  googleRating={row.googleRating}
                />
              </td>
              <td>
                <PhoneWebsiteStatusCell website={row.website} />
              </td>
              <td>{fmtText(row.messageStatus)}</td>
              <td>{fmtText(row.replyStatus)}</td>
              <td>{fmtText(row.nextAction)}</td>
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
    <div className="table-wrap">
      <table className="queue">
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Area</th>
            <th>Industry</th>
            <th>Lead Level</th>
            <th>Message Status</th>
            <th>Reply Status</th>
            <th>Contact Status</th>
            <th>Lead Temperature</th>
            <th>Next Check</th>
            <th>Next Follow-up</th>
            <th>Next Action</th>
            <th>Campaign</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td>{fmtText(row.businessName)}</td>
              <td>{fmtText(row.area)}</td>
              <td>{fmtText(row.assignedIndustry)}</td>
              <td>
                <LeadAngleCell
                  leadLevel={row.leadLevel}
                  reviewCount={row.reviewCount}
                />
              </td>
              <td>{fmtText(row.messageStatus)}</td>
              <td>{fmtText(row.replyStatus)}</td>
              <td>{fmtText(row.contactStatus)}</td>
              <td>{fmtText(row.leadTemperature)}</td>
              <td>{fmtDate(row.nextCheckAt)}</td>
              <td>{fmtDate(row.nextFollowUpAt)}</td>
              <td>{fmtText(row.nextAction)}</td>
              <td>{fmtText(row.campaignName)}</td>
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
  searchParams: Promise<{ limit?: string | string[]; phone?: string | string[] }>;
}) {
  const sp = await searchParams;
  const limit = resolveQueueDisplayLimit(sp.limit);
  const phoneQuery = resolvePhoneQuery(sp.phone);
  const phoneDigits = normalizePhoneDigits(phoneQuery);
  const hasPhoneQuery = phoneQuery.length > 0;
  const phoneSearchOk = hasPhoneQuery && phoneDigits.length >= 4;

  const [messageQueue, followUpQueue, phoneSearchRows] = await Promise.all([
    getMessageQueue(prisma, { limit }),
    getFollowUpQueue(prisma, { limit }),
    phoneSearchOk
      ? searchLeadsByPhone(prisma, phoneQuery, { limit: 20 })
      : Promise.resolve([] as PhoneSearchLeadRow[]),
  ]);

  return (
    <div className="page">
      <p className="top-links">
        <Link className="top-link" href="/">
          Home
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/import">
          Import Excel
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/reply-sop">
          Reply SOP Settings
        </Link>
      </p>
      <h1>Queues</h1>
      <p className="sub">
        Read-only view. Data from <code>getMessageQueue</code> and{" "}
        <code>getFollowUpQueue</code> — no writes.
      </p>

      <div className="queues-toolbar">
        <PhoneSearchForm currentLimit={limit} initialPhone={phoneQuery} />
        <QueueLimitSelector currentLimit={limit} currentPhone={phoneQuery} />
      </div>

      {hasPhoneQuery ? (
        <div className="section phone-search-results-section">
          <h2>Phone Search Results</h2>
          {!phoneSearchOk ? (
            <p className="empty">Enter at least 4 digits to search.</p>
          ) : phoneSearchRows.length === 0 ? (
            <p className="empty">No leads found for this phone.</p>
          ) : (
            <PhoneSearchResultsTable leads={phoneSearchRows} />
          )}
        </div>
      ) : null}

      <div className="section">
        <h2>Message Queue</h2>
        {MESSAGE_SECTIONS.map(({ key, title }) => {
          const group = messageQueue[key];
          return (
            <div className="group" key={key}>
              <QueueSection
                key={`msg-${String(key)}-${limit}`}
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
    </div>
  );
}
