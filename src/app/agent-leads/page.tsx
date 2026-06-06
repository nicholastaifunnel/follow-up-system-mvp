import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAgentLead } from "@/getAgentLead";
import { AgentLeadCard } from "./AgentLeadCard";

export const dynamic = "force-dynamic";

export default async function AgentLeadsPage() {
  const lead = await getAgentLead(prisma);

  return (
    <div className="page agent-leads-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
        </Link>
      </p>
      <h1>AI Leads</h1>
      <p className="sub">One prepared lead at a time for OpenClaw sending.</p>

      {lead ? (
        <AgentLeadCard lead={lead} />
      ) : (
        <div className="section">
          <p className="empty">No prepared leads ready for AI agent.</p>
          <p className="sub">Approve and prepare more leads first.</p>
        </div>
      )}
    </div>
  );
}
