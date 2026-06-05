import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildApplyFormUrl } from "@/appUrl";
import { AdApplyLinkForm } from "./AdApplyLinkForm";
import { AdApplyLinkRow } from "./AdApplyLinkRow";

export const dynamic = "force-dynamic";

export default async function AdApplyLinksPage() {
  const links = await prisma.adApplyLink.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="page ad-apply-links-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/landing-pages">
          Landing Pages
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/ad-leads">
          Ad Leads
        </Link>
      </p>
      <h1>Ad Apply Links</h1>
      <p className="sub">
        Create one apply link per landing page or funnel step. Link name is required;
        landing page and Facebook Ads fields can stay empty until campaigns are ready.
      </p>
      <p className="sub ad-apply-links-hint">
        Use the full form link below as the button URL on your landing page.
      </p>

      <section className="section ad-apply-new-section">
        <h2 className="ad-section-heading">New apply link</h2>
        <AdApplyLinkForm />
      </section>

      <section className="section">
        <h2 className="ad-section-heading">All links ({links.length})</h2>
        {links.length === 0 ? (
          <p className="empty">No apply links yet.</p>
        ) : (
          <div className="ad-apply-links-list">
            {links.map((link) => (
              <AdApplyLinkRow
                key={link.id}
                link={link}
                fullFormLink={buildApplyFormUrl(link.slug)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
