import { prisma } from "@/lib/prisma";
import { ApplyForm } from "./ApplyForm";

export const dynamic = "force-dynamic";

export default async function PublicApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const link = await prisma.adApplyLink.findUnique({ where: { slug } });

  if (!link || !link.isActive) {
    return (
      <div className="public-apply-shell">
        <div className="page public-apply-page">
          <div className="public-apply-card">
            <h1>表格暂时无法使用 / Form unavailable</h1>
            <p className="public-apply-bilingual">
              这个免费试用表格目前未开放，请稍后再试或联系我们。
            </p>
            <p className="public-apply-bilingual">
              This free trial form is not available right now. Please try again later
              or contact us.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-apply-shell">
      <div className="page public-apply-page">
        <div className="public-apply-card">
          <h1>申请免费试用 / Free Trial Request</h1>
          <p className="public-apply-lead">
            填写资料后，我们会通过 WhatsApp 跟你确认设置。
          </p>
          <p className="public-apply-bilingual">
            Submit your details and we&apos;ll confirm the setup by WhatsApp.
          </p>
          <ApplyForm slug={slug} />
        </div>
      </div>
    </div>
  );
}
