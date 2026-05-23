import { buildWhatsAppMeUrl } from "@/lib/digitsForWaMe";

export const dynamic = "force-dynamic";

function buildThankYouWhatsAppMessage(businessName: string): string {
  const intro = "你好，我已经申请 Review QR System 1个月免费试用。";
  if (businessName) {
    return `${intro}\n\n店铺：${businessName}\n\n请帮我确认开通。`;
  }
  return `${intro}\n\n请帮我确认开通。`;
}

export default async function ApplyThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string | string[] }>;
}) {
  const sp = await searchParams;
  const businessRaw = Array.isArray(sp.business) ? sp.business[0] : sp.business;
  const businessName = (businessRaw ?? "").trim();

  const supportDigits = (process.env.AD_SUPPORT_WHATSAPP_DIGITS ?? "").replace(/\D/g, "");
  const message = buildThankYouWhatsAppMessage(businessName);
  // TODO: Track WhatsApp confirmation button click for ads funnel analysis.
  const waHref = supportDigits
    ? buildWhatsAppMeUrl(null, null, message, supportDigits)
    : null;

  return (
    <div className="public-apply-shell">
      <div className="page public-apply-page">
        <div className="public-apply-card public-thank-you-card">
          <h1>申请已收到</h1>
          <p className="public-apply-lead">
            我们已经收到你的资料。
            <br />
            请点击 WhatsApp 联系我们完成确认。
          </p>
          <p className="public-apply-bilingual">
            We&apos;ve received your details.
            <br />
            Please WhatsApp us to confirm your setup.
          </p>
          {businessName ? (
            <p className="public-apply-business-line">
              店铺：<strong>{businessName}</strong>
            </p>
          ) : null}
          {waHref ? (
            <a
              className="public-apply-wa-btn"
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp 确认开通
            </a>
          ) : (
            <p className="public-apply-wa-fallback">
              WhatsApp button is not configured yet. Please contact us manually.
            </p>
          )}
          <p className="public-apply-thankyou-note">
            资料已记录，不需要重复提交。
            <span className="public-apply-footnote-en">No need to submit again.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
