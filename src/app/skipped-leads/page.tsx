import Link from "next/link";
import { getSkippedLeads } from "@/getSkippedLeads";
import { prisma } from "@/lib/prisma";
import { SkippedLeadsSection } from "../queues/SkippedLeadsSection";

export const dynamic = "force-dynamic";

function resolveQueueDisplayLimit(
  raw: string | string[] | undefined,
): 10 | 20 | 50 {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === "") return 10;
  const n = Number.parseInt(String(v), 10);
  if (n === 20 || n === 50) return n;
  return 10;
}

const LIMIT_OPTIONS = [10, 20, 50] as const;

export default async function SkippedLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string | string[] }>;
}) {
  const sp = await searchParams;
  const limit = resolveQueueDisplayLimit(sp.limit);
  const { count, leads } = await getSkippedLeads(prisma, { limit });

  return (
    <div className="page queues-work-page">
      <p className="top-links">
        <Link className="top-link" href="/">
          Home
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/queues">
          Queues
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/import">
          Import Excel
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/reply-sop">
          Reply SOP Settings
        </Link>
      </p>
      <h1>Skipped Leads</h1>
      <p className="sub">
        Leads skipped from Message Queue and Follow-up Queue. Restore returns a lead to
        the queues.
      </p>

      <div className="queues-toolbar">
        <div className="queue-limit-bar" role="navigation" aria-label="Rows per section">
          <span className="queue-limit-label">Rows per section:</span>
          {LIMIT_OPTIONS.map((n) => (
            <Link
              key={n}
              href={`/skipped-leads?limit=${n}`}
              className={
                limit === n ? "queue-limit-pill queue-limit-pill-active" : "queue-limit-pill"
              }
              prefetch={false}
            >
              {n}
            </Link>
          ))}
        </div>
      </div>

      <SkippedLeadsSection count={count} leads={leads} />
    </div>
  );
}
