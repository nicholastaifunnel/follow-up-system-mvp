import Link from "next/link";
import { LandingPageCard } from "./LandingPageCard";

const ACTIVE_LANDING_PAGES = [
  {
    name: "Review QR System",
    landingPath: "/review-qr-system",
    applyPath: "/apply/beauty-1",
    audience: "Beauty / facial / spa owners",
    purpose: "Review QR System free trial landing page",
    status: "Active",
  },
] as const;

export default function LandingPagesPage() {
  return (
    <div className="page landing-pages-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/ad-apply-links">
          Ad Apply Links
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/ad-leads">
          Ad Leads
        </Link>
      </p>
      <h1>Landing Pages</h1>
      <p className="sub">
        Manage ad landing page links and their connected apply forms.
      </p>

      <section className="section">
        <h2>Active Landing Pages</h2>
        <div className="ad-apply-links-list">
          {ACTIVE_LANDING_PAGES.map((page) => (
            <LandingPageCard key={page.landingPath} page={page} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Notes / Flow</h2>
        <p className="sub">
          Standard ad funnel for Review QR System:
        </p>
        <p className="sub">
          Ad → Landing Page → Apply Form / Modal → Thank You → WhatsApp Confirmation
        </p>
        <ul className="sub">
          <li>
            The public landing page at <code>/review-qr-system</code> opens the apply
            form in a modal (slug <code>beauty-1</code>).
          </li>
          <li>
            Direct apply form URL <code>/apply/beauty-1</code> is also available for
            button links or testing.
          </li>
          <li>
            Approved trial leads appear in <Link href="/ad-leads">Ad Leads</Link> and
            follow-up work in <Link href="/review-trials">Review Trials</Link>.
          </li>
        </ul>
      </section>
    </div>
  );
}
