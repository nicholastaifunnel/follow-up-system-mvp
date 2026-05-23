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
      <div className="page public-apply-page">
        <div className="public-apply-card">
          <h1>Form unavailable</h1>
          <p className="sub">This free trial form is not active or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page public-apply-page">
      <div className="public-apply-card">
        <h1>Free trial request</h1>
        <ApplyForm slug={slug} linkName={link.name} />
      </div>
    </div>
  );
}
