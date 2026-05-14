import Link from "next/link";
import { getSkippedLeads } from "@/getSkippedLeads";
import { prisma } from "@/lib/prisma";
import { skipReasonLabel } from "@/skipLeadReasons";
import { QueueSection } from "./QueueSection";
import { RestoreLeadButton } from "../leads/[id]/RestoreLeadButton";

function fmtText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

function fmtDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function SkippedAngleCell({
  leadLevel,
  reviewCount,
}: {
  leadLevel: string | null;
  reviewCount: number | null;
}) {
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
      {isLowReview && reviewCount != null ? (
        <div className="queue-angle-reviews">Reviews: {reviewCount}</div>
      ) : null}
    </div>
  );
}

function SkippedReviewsCell({
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

export async function SkippedLeadsSection({ limit }: { limit: number }) {
  const { count, leads } = await getSkippedLeads(prisma, { limit });

  return (
    <div className="section skipped-leads-section">
      <QueueSection
        title="Skipped Leads"
        totalCount={count}
        shownCount={leads.length}
        defaultExpanded={false}
      >
        {leads.length === 0 ? (
          <p className="empty">No skipped leads.</p>
        ) : (
          <div className="table-wrap queue-work-table-wrap">
            <table className="queue queue-work-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Phone</th>
                  <th>Area</th>
                  <th>Lead Angle</th>
                  <th>Reviews</th>
                  <th>Skip Reason</th>
                  <th>Skipped At</th>
                  <th>Action</th>
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
                      <SkippedAngleCell
                        leadLevel={row.leadLevel}
                        reviewCount={row.reviewCount}
                      />
                    </td>
                    <td>
                      <SkippedReviewsCell
                        reviewCount={row.reviewCount}
                        googleRating={row.googleRating}
                      />
                    </td>
                    <td>{skipReasonLabel(row.skipReason)}</td>
                    <td>{fmtDate(row.skippedAt)}</td>
                    <td>
                      <div className="skipped-actions-cell">
                        <RestoreLeadButton leadId={row.id} compact />
                        <Link href={`/leads/${row.id}`}>View</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueueSection>
    </div>
  );
}
