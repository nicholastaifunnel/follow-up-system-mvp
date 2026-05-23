import { prisma } from "@/lib/prisma";
import { buildWhatsAppMeUrl } from "@/lib/digitsForWaMe";

export const dynamic = "force-dynamic";

function dash(v: string | null | undefined): string {
  return v && v.trim() ? v.trim() : "";
}

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
  const businessName = dash(businessRaw);

  const link = await prisma.adApplyLink.findUnique({ where: { slug } });

  const supportDigits = (process.env.AD_SUPPORT_WHATSAPP_DIGITS ?? "").replace(/\D/g, "");
  const message = businessName
    ? `Hi, I have submitted the free trial request form. My business name is ${businessName}.`
    : "Hi, I have submitted the free trial request form.";
  const waHref = supportDigits
    ? buildWhatsAppMeUrl(null, null, message, supportDigits)
    : null;

  const contextParts = [
    link?.name,
    dash(link?.industry) || null,
    dash(link?.landingPageName) || null,
    dash(link?.landingPageVersion) ? `LP ${link?.landingPageVersion}` : null,
  ].filter(Boolean);

  return (
    <div className="page public-apply-page">
      <div className="public-apply-card public-apply-thankyou">
        <h1>Your free trial request has been submitted</h1>
        <p className="sub">
          We received your details. Please WhatsApp us so we can confirm your setup
          and next steps.
        </p>
        {contextParts.length > 0 ? (
          <p className="sub public-apply-thankyou-context">{contextParts.join(" · ")}</p>
        ) : null}
        {waHref ? (
          <a
            className="public-apply-wa-btn"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp us now
          </a>
        ) : (
          <p className="sub public-apply-wa-fallback">
            Please message us on WhatsApp to confirm your request.
          </p>
        )}
        <p className="sub public-apply-thankyou-note">
          Your request has already been recorded. Please do not submit again unless
          your details are wrong.
        </p>
      </div>
    </div>
  );
}
