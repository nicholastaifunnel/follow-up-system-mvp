import type { Prisma, PrismaClient } from "@prisma/client";

export type SkippedLeadRow = {
  id: string;
  businessName: string;
  phone: string | null;
  internationalPhone: string | null;
  area: string | null;
  leadLevel: string | null;
  reviewCount: number | null;
  googleRating: number | null;
  skipReason: string | null;
  skippedAt: Date;
};

const leadSelect = {
  id: true,
  businessName: true,
  phone: true,
  internationalPhone: true,
  area: true,
  leadLevel: true,
  reviewCount: true,
  googleRating: true,
  skipReason: true,
  skippedAt: true,
} satisfies Prisma.LeadSelect;

type Row = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

function toRow(lead: Row): SkippedLeadRow {
  return {
    id: lead.id,
    businessName: lead.businessName,
    phone: lead.phone,
    internationalPhone: lead.internationalPhone,
    area: lead.area,
    leadLevel: lead.leadLevel,
    reviewCount: lead.reviewCount,
    googleRating: lead.googleRating,
    skipReason: lead.skipReason,
    skippedAt: lead.skippedAt!,
  };
}

export type GetSkippedLeadsOptions = {
  limit?: number;
};

/**
 * Active skips (not archived). Read-only.
 */
export async function getSkippedLeads(
  db: PrismaClient,
  options?: GetSkippedLeadsOptions,
): Promise<{ count: number; leads: SkippedLeadRow[] }> {
  const raw = options?.limit ?? 50;
  const limit = Number.isFinite(raw)
    ? Math.min(500, Math.max(1, Math.floor(raw)))
    : 50;

  const where: Prisma.LeadWhereInput = {
    isArchived: false,
    skippedAt: { not: null },
  };

  const [count, rows] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      select: leadSelect,
      orderBy: [{ skippedAt: "desc" }],
      take: limit,
    }),
  ]);

  return { count, leads: rows.map(toRow) };
}
