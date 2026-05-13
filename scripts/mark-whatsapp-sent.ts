import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { markWhatsAppFirstMessageSent } from "../src/markWhatsAppFirstMessageSent";
import { MESSAGE_STATUS_PREPARED } from "../src/statusConstants";

type Snapshot = {
  businessName: string;
  messageStatus: string;
  replyStatus: string | null;
  contactStatus: string;
  botStatus: string;
  firstMessageSentAt: Date | null;
  lastMessageSentAt: Date | null;
  nextCheckAt: Date | null;
  nextFollowUpAt: Date | null;
};

const snapshotSelect = {
  businessName: true,
  messageStatus: true,
  replyStatus: true,
  contactStatus: true,
  botStatus: true,
  firstMessageSentAt: true,
  lastMessageSentAt: true,
  nextCheckAt: true,
  nextFollowUpAt: true,
} as const;

type LeadSnap = Prisma.LeadGetPayload<{ select: typeof snapshotSelect }>;

function parseArgs(argv: string[]): {
  leadId: string | null;
  message: string | undefined;
  force: boolean;
} {
  let leadId: string | null = null;
  let message: string | undefined;
  let force = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--message" && argv[i + 1]) {
      message = argv[i + 1];
      i += 1;
    } else if (a === "--force") {
      force = true;
    } else if (!a.startsWith("-") && leadId === null) {
      leadId = a;
    }
  }

  return { leadId, message, force };
}

function toSnapshot(row: LeadSnap): Snapshot {
  return {
    businessName: row.businessName,
    messageStatus: row.messageStatus,
    replyStatus: row.replyStatus,
    contactStatus: row.contactStatus,
    botStatus: row.botStatus,
    firstMessageSentAt: row.firstMessageSentAt,
    lastMessageSentAt: row.lastMessageSentAt,
    nextCheckAt: row.nextCheckAt,
    nextFollowUpAt: row.nextFollowUpAt,
  };
}

function printSnapshot(label: string, s: Snapshot): void {
  console.log(`\n${label}`);
  console.log("  businessName:", s.businessName);
  console.log("  messageStatus:", s.messageStatus);
  console.log("  replyStatus:", s.replyStatus ?? "(null)");
  console.log("  contactStatus:", s.contactStatus);
  console.log("  botStatus:", s.botStatus);
  console.log("  firstMessageSentAt:", s.firstMessageSentAt?.toISOString() ?? "(null)");
  console.log("  lastMessageSentAt:", s.lastMessageSentAt?.toISOString() ?? "(null)");
  console.log("  nextCheckAt:", s.nextCheckAt?.toISOString() ?? "(null)");
  console.log("  nextFollowUpAt:", s.nextFollowUpAt?.toISOString() ?? "(null)");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { leadId, message, force } = parseArgs(argv);

  if (!leadId) {
    console.error(
      'Usage: npm run message:mark-sent -- "<leadId>" [--message "exact text sent"] [--force]',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const beforeRow = await prisma.lead.findUnique({
      where: { id: leadId },
      select: snapshotSelect,
    });

    if (!beforeRow) {
      console.error(`Error: Lead not found: ${leadId}`);
      process.exit(1);
    }

    if (
      beforeRow.messageStatus !== MESSAGE_STATUS_PREPARED &&
      !force
    ) {
      console.error(
        `Warning: Lead messageStatus is "${beforeRow.messageStatus}", not "${MESSAGE_STATUS_PREPARED}".`,
      );
      console.error(
        "No update performed. Prepare the message first, or pass --force to override (MVP).",
      );
      process.exit(1);
    }

    if (
      beforeRow.messageStatus !== MESSAGE_STATUS_PREPARED &&
      force
    ) {
      console.warn(
        `--force: marking sent even though messageStatus was "${beforeRow.messageStatus}".`,
      );
    }

    printSnapshot("Before:", toSnapshot(beforeRow));

    await markWhatsAppFirstMessageSent(prisma, {
      leadId,
      lastOutboundMessage:
        message !== undefined ? message : undefined,
    });

    const afterRow = await prisma.lead.findUnique({
      where: { id: leadId },
      select: snapshotSelect,
    });

    if (!afterRow) {
      throw new Error("Lead disappeared after update");
    }

    printSnapshot("After:", toSnapshot(afterRow));

    console.log(
      "\n(Marked as sent locally only — no WhatsApp API, webhook, or outbound send.)",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
