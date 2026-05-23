import Link from "next/link";
import { buildWhatsAppMeUrl } from "@/lib/digitsForWaMe";

export const dynamic = "force-dynamic";

export default async function ApplyThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ business?: string | string[] }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const businessRaw = Array.isArray(sp.business) ? sp.business[0] : sp.business;
  const businessName = (businessRaw ?? "my business").trim() || "my business";

  const supportDigits = (process.env.AD_SUPPORT_WHATSAPP_DIGITS ?? "").replace(/\D/g, "");
  const message = `Hi Nicholas, I already submitted the free trial form for ${businessName}.`;
  const waHref = supportDigits
    ? buildWhatsAppMeUrl(null, null, message, supportDigits)
    : null;

  return (
    <div className="page public-apply-page">
      <div className="public-apply-card public-apply-thankyou">
        <h1>Thank you</h1>
        <p className="sub">
          Your free trial request has been received. We will review your application
          shortly.
        </p>
        <h2 className="public-apply-next-heading">Next step</h2>
        <p className="sub">
          Tap below to message us on WhatsApp and confirm your request.
        </p>
        {waHref ? (
          <a
            className="public-apply-wa-btn"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact us on WhatsApp
          </a>
        ) : (
          <p className="sub public-apply-wa-fallback">
            Please message us on WhatsApp to confirm your request.
          </p>
        )}
        <p className="sub public-apply-back">
          <Link href={`/apply/${slug}`}>Back to form</Link>
        </p>
      </div>
    </div>
  );
}
