import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAdLeadsInbox } from "@/getAdLeadsInbox";
import { AdLeadsExportPanel } from "./AdLeadsExportPanel";
import { AdLeadsTable } from "./AdLeadsTable";
import { QueueSection } from "@/app/queues/QueueSection";

export const dynamic = "force-dynamic";

export default async function AdLeadsPage() {
  const [inbox, applyLinks, campaignRows] = await Promise.all([
    getAdLeadsInbox(prisma, { limit: 100 }),
    prisma.adApplyLink.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({
      where: { adCampaignName: { not: null } },
      select: { adCampaignName: true },
      distinct: ["adCampaignName"],
    }),
  ]);

  const campaigns = campaignRows
    .map((r) => r.adCampaignName)
    .filter((c): c is string => Boolean(c?.trim()));

  return (
    <div className="page ad-leads-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
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
        <Link className="top-link" href="/review-trials">
          Review Follow-up
        </Link>
      </p>
      <h1>Ad Leads</h1>
      <p className="sub">
        Review free trial requests from landing page forms. Approved leads appear in
        Review Follow-up — not in cold outreach.
      </p>

      <AdLeadsExportPanel applyLinks={applyLinks} campaigns={campaigns} />

      <div className="ad-leads-sections">
        <div className="group">
          <QueueSection
            title="New Trial Requests"
            totalCount={inbox.newTrialRequests.count}
            shownCount={inbox.newTrialRequests.leads.length}
            defaultExpanded
          >
            <AdLeadsTable leads={inbox.newTrialRequests.leads} />
          </QueueSection>
        </div>
        <div className="group">
          <QueueSection
            title="Need More Info"
            totalCount={inbox.needMoreInfo.count}
            shownCount={inbox.needMoreInfo.leads.length}
            defaultExpanded={inbox.needMoreInfo.count > 0}
          >
            <AdLeadsTable leads={inbox.needMoreInfo.leads} />
          </QueueSection>
        </div>
        <div className="group">
          <QueueSection
            title="Approved Trial Requests"
            totalCount={inbox.approved.count}
            shownCount={inbox.approved.leads.length}
            defaultExpanded={false}
          >
            <AdLeadsTable leads={inbox.approved.leads} showActions={false} />
          </QueueSection>
        </div>
        <div className="group">
          <QueueSection
            title="Rejected / Not Suitable"
            totalCount={inbox.rejected.count}
            shownCount={inbox.rejected.leads.length}
            defaultExpanded={false}
          >
            <AdLeadsTable leads={inbox.rejected.leads} showActions={false} />
          </QueueSection>
        </div>
      </div>
    </div>
  );
}
