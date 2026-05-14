import Link from "next/link";
import { notFound } from "next/navigation";
import { ReplyAssistantClient } from "./ReplyAssistantClient";
import { prisma } from "@/lib/prisma";
import { MESSAGE_STATUS_FIRST_SENT } from "@/statusConstants";

export const dynamic = "force-dynamic";

const REPLY_ASSISTANT_BLOCKED_HINT =
  "Reply outcome is available after the first message is sent.";

function computeCanRecordReply(lead: {
  isArchived: boolean;
  messageStatus: string;
}): boolean {
  if (lead.isArchived) return false;
  return lead.messageStatus === MESSAGE_STATUS_FIRST_SENT;
}

export default async function ReplyAssistantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      businessName: true,
      phone: true,
      internationalPhone: true,
      area: true,
      assignedIndustry: true,
      leadLevel: true,
      messageStatus: true,
      replyStatus: true,
      contactStatus: true,
      nextAction: true,
      preparedMessage: true,
      isArchived: true,
    },
  });

  if (!lead) {
    notFound();
  }

  const canRecordReply = computeCanRecordReply({
    isArchived: lead.isArchived,
    messageStatus: lead.messageStatus,
  });

  return (
    <div className="page lead-detail reply-assistant-page">
      <p className="top-links">
        <Link className="top-link" href={`/leads/${id}`}>
          ← Back to lead
        </Link>
        <span className="top-links-sep">·</span>
        <Link className="top-link" href="/queues">
          Queues
        </Link>
      </p>
      <header className="lead-header">
        <h1>SOP Reply Assistant</h1>
        <p className="sub">
          {lead.businessName} — fixed templates, no AI
        </p>
      </header>

      <ReplyAssistantClient
        leadId={id}
        businessName={lead.businessName}
        phone={lead.phone}
        internationalPhone={lead.internationalPhone}
        area={lead.area}
        assignedIndustry={lead.assignedIndustry}
        leadLevel={lead.leadLevel}
        messageStatus={lead.messageStatus}
        replyStatus={lead.replyStatus}
        contactStatus={lead.contactStatus}
        nextAction={lead.nextAction}
        preparedMessage={lead.preparedMessage}
        canRecordReply={canRecordReply}
        recordReplyBlockedReason={REPLY_ASSISTANT_BLOCKED_HINT}
      />
    </div>
  );
}
