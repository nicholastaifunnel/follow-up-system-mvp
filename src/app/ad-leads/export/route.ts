import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAdLeadsCsv, fetchAdLeadsForExport } from "@/exportAdLeadsCsv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? undefined;
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;
  const approvedOnly = url.searchParams.get("approvedOnly") === "1";
  const campaignName = url.searchParams.get("campaignName") ?? undefined;
  const applyLinkId = url.searchParams.get("applyLinkId") ?? undefined;

  const rows = await fetchAdLeadsForExport(prisma, {
    date: date || undefined,
    dateFrom: !date && dateFrom ? dateFrom : undefined,
    dateTo: !date && dateTo ? dateTo : undefined,
    approvedOnly,
    campaignName: campaignName || undefined,
    applyLinkId: applyLinkId || undefined,
  });

  const csv = buildAdLeadsCsv(rows);
  const filename = `ad-leads-${date ?? dateFrom ?? "export"}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
