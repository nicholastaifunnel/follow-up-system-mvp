import type { PrismaClient } from "@prisma/client";
import { withActiveOutreachWhere } from "@/doNotContact";
import { digitsForWaMe } from "@/lib/digitsForWaMe";
import { LEAD_REVIEW_APPROVED } from "@/leadReviewStatus";
import { MESSAGE_STATUS_PREPARED } from "@/statusConstants";

export type AgentLeadRow = {
  id: string;
  businessName: string;
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone: string | null;
  preparedMessage: string;
  preparedAt: Date | null;
  updatedAt: Date;
};

const agentLeadSelect = {
  id: true,
  businessName: true,
  phone: true,
  internationalPhone: true,
  whatsappPhone: true,
  preparedMessage: true,
  preparedAt: true,
  updatedAt: true,
} as const;

/**
 * Next Ready + Prepared lead for /agent-leads (one at a time).
 * Read-only; does not copy lead data.
 */
export async function getAgentLead(
  db: PrismaClient,
): Promise<AgentLeadRow | null> {
  const candidates = await db.lead.findMany({
    where: withActiveOutreachWhere({
      outreachReadiness: LEAD_REVIEW_APPROVED,
      messageStatus: MESSAGE_STATUS_PREPARED,
      preparedMessage: { not: null },
      handoffRequired: false,
    }),
    select: agentLeadSelect,
    orderBy: [{ preparedAt: "asc" }, { updatedAt: "asc" }],
    take: 20,
  });

  for (const lead of candidates) {
    const preparedMessage = (lead.preparedMessage ?? "").trim();
    if (!preparedMessage) continue;

    const digits = digitsForWaMe(
      lead.phone,
      lead.internationalPhone,
      lead.whatsappPhone,
    );
    if (!digits) continue;

    return {
      id: lead.id,
      businessName: lead.businessName,
      phone: lead.phone,
      internationalPhone: lead.internationalPhone,
      whatsappPhone: lead.whatsappPhone,
      preparedMessage,
      preparedAt: lead.preparedAt,
      updatedAt: lead.updatedAt,
    };
  }

  return null;
}
