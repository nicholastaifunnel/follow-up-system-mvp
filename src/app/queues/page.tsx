import Link from "next/link";
import { getFollowUpQueue } from "@/getFollowUpQueue";
import type {
  FollowUpQueueGroup,
  FollowUpQueueLeadRow,
  FollowUpQueueResult,
} from "@/getFollowUpQueue";
import { getMessageQueue } from "@/getMessageQueue";
import type {
  MessageQueueGroup,
  MessageQueueLeadRow,
  MessageQueueResult,
} from "@/getMessageQueue";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16);
}

const MESSAGE_SECTIONS: { key: keyof MessageQueueResult; title: string }[] = [
  { key: "notPrepared", title: "Not Prepared" },
  { key: "preparedNotSent", title: "Prepared Not Sent" },
  { key: "firstMessageSent", title: "First Message Sent" },
  { key: "waitingReply", title: "Waiting Reply" },
  { key: "needHuman", title: "Need Human" },
];

const FOLLOWUP_SECTIONS: { key: keyof FollowUpQueueResult; title: string }[] = [
  { key: "dueToday", title: "Due Today" },
  { key: "overdue", title: "Overdue" },
  { key: "noReplyToCheck", title: "No Reply To Check" },
  { key: "needHuman", title: "Need Human" },
  { key: "followUpLater", title: "Follow Up Later" },
];

function MessageQueueTable({ leads }: { leads: MessageQueueLeadRow[] }) {
  return (
    <div className="table-wrap">
      <table className="queue">
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Area</th>
            <th>Industry</th>
            <th>Lead Level</th>
            <th>Message Status</th>
            <th>Reply Status</th>
            <th>Contact Status</th>
            <th>Lead Temperature</th>
            <th>Next Check</th>
            <th>Next Follow-up</th>
            <th>Next Action</th>
            <th>Campaign</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td>{fmtText(row.businessName)}</td>
              <td>{fmtText(row.area)}</td>
              <td>{fmtText(row.assignedIndustry)}</td>
              <td>{fmtText(row.leadLevel)}</td>
              <td>{fmtText(row.messageStatus)}</td>
              <td>{fmtText(row.replyStatus)}</td>
              <td>{fmtText(row.contactStatus)}</td>
              <td>—</td>
              <td>{fmtDate(row.nextCheckAt)}</td>
              <td>{fmtDate(row.nextFollowUpAt)}</td>
              <td>—</td>
              <td>{fmtText(row.campaignName)}</td>
              <td>
                <Link href={`/leads/${row.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FollowUpQueueTable({ leads }: { leads: FollowUpQueueLeadRow[] }) {
  return (
    <div className="table-wrap">
      <table className="queue">
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Area</th>
            <th>Industry</th>
            <th>Lead Level</th>
            <th>Message Status</th>
            <th>Reply Status</th>
            <th>Contact Status</th>
            <th>Lead Temperature</th>
            <th>Next Check</th>
            <th>Next Follow-up</th>
            <th>Next Action</th>
            <th>Campaign</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => (
            <tr key={row.id}>
              <td>{fmtText(row.businessName)}</td>
              <td>{fmtText(row.area)}</td>
              <td>{fmtText(row.assignedIndustry)}</td>
              <td>{fmtText(row.leadLevel)}</td>
              <td>{fmtText(row.messageStatus)}</td>
              <td>{fmtText(row.replyStatus)}</td>
              <td>{fmtText(row.contactStatus)}</td>
              <td>{fmtText(row.leadTemperature)}</td>
              <td>{fmtDate(row.nextCheckAt)}</td>
              <td>{fmtDate(row.nextFollowUpAt)}</td>
              <td>{fmtText(row.nextAction)}</td>
              <td>{fmtText(row.campaignName)}</td>
              <td>
                <Link href={`/leads/${row.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueueGroupBlock({
  title,
  group,
  variant,
}: {
  title: string;
  group: MessageQueueGroup | FollowUpQueueGroup;
  variant: "message" | "followup";
}) {
  return (
    <div className="group">
      <h3>{title}</h3>
      <p className="meta">Count: {group.count}</p>
      {group.leads.length === 0 ? (
        <p className="empty">No leads</p>
      ) : variant === "message" ? (
        <MessageQueueTable leads={(group as MessageQueueGroup).leads} />
      ) : (
        <FollowUpQueueTable leads={(group as FollowUpQueueGroup).leads} />
      )}
    </div>
  );
}

export default async function QueuesPage() {
  const [messageQueue, followUpQueue] = await Promise.all([
    getMessageQueue(prisma),
    getFollowUpQueue(prisma),
  ]);

  return (
    <div className="page">
      <a className="top-link" href="/">
        Home
      </a>
      <h1>Queues</h1>
      <p className="sub">
        Read-only view. Data from <code>getMessageQueue</code> and{" "}
        <code>getFollowUpQueue</code> — no writes.
      </p>

      <div className="section">
        <h2>Message Queue</h2>
        {MESSAGE_SECTIONS.map(({ key, title }) => (
          <QueueGroupBlock
            key={key}
            title={title}
            group={messageQueue[key]}
            variant="message"
          />
        ))}
      </div>

      <div className="section">
        <h2>Follow-up Queue</h2>
        {FOLLOWUP_SECTIONS.map(({ key, title }) => (
          <QueueGroupBlock
            key={key}
            title={title}
            group={followUpQueue[key]}
            variant="followup"
          />
        ))}
      </div>
    </div>
  );
}
