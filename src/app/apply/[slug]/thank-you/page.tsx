import { buildWhatsAppMeUrl } from "@/lib/digitsForWaMe";

export const dynamic = "force-dynamic";

export default async function ApplyThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string | string[] }>;
}) {
  const sp = await searchParams;
  const businessRaw = Array.isArray(sp.business) ? sp.business[0] : sp.business;
  const businessName = (businessRaw ?? "").trim();

  const supportDigits = (process.env.AD_SUPPORT_WHATSAPP_DIGITS ?? "").replace(/\D/g, "");
  const message = businessName
    ? `你好，我已经提交免费试用申请。\n店名：${businessName}\n请帮我确认下一步设置，谢谢。`
    : "你好，我已经提交免费试用申请。\n请帮我确认下一步设置，谢谢。";
  const waHref = supportDigits
    ? buildWhatsAppMeUrl(null, null, message, supportDigits)
    : null;

  return (
    <div className="public-apply-shell">
      <div className="page public-apply-page">
        <div className="public-apply-card public-thank-you-card">
          <h1>申请已收到 / Request Submitted</h1>
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
              店铺 / Business: <strong>{businessName}</strong>
            </p>
          ) : null}
          {waHref ? (
            <a
              className="public-apply-wa-btn"
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp 联系我们 / WhatsApp Us Now
            </a>
          ) : (
            <p className="public-apply-wa-fallback">
              WhatsApp button is not configured yet. Please contact us manually.
            </p>
          )}
          <p className="public-apply-thankyou-note">
            资料已记录，无需重复提交。
            <span className="public-apply-footnote-en">
              Your details have been recorded. No need to submit again.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
