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
    ? `你好，我已经提交免费试用申请。店名：${businessName}。请帮我确认下一步。`
    : "你好，我已经提交免费试用申请，请帮我确认下一步。";
  const waHref = supportDigits
    ? buildWhatsAppMeUrl(null, null, message, supportDigits)
    : null;

  return (
    <div className="public-apply-shell">
      <div className="page public-apply-page">
        <div className="public-apply-card public-thank-you-card">
          <h1>申请已收到 / Request Submitted</h1>
          <p className="public-apply-lead">
            我们已经收到你的免费试用申请。请点击下面的 WhatsApp
            按钮联系我们，我们会帮你确认设置资料和下一步。
          </p>
          <p className="public-apply-bilingual">
            We&apos;ve received your free trial request. Please WhatsApp us now so
            we can confirm your setup details and next steps.
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
            你的资料已经记录在系统里，不需要重复提交。
          </p>
          <p className="public-apply-thankyou-note">
            Your details have been recorded. No need to submit again unless your
            details are wrong.
          </p>
        </div>
      </div>
    </div>
  );
}
