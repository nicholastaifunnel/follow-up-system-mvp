import { PrismaClient } from "@prisma/client";
import {
  REPLY_CHECK_SNAPSHOT_SELECT,
  type ReplyCheckSnapshot,
  type ReplyOutcomeKey,
  SUPPORTED_OUTCOMES,
  recordReplyOutcome,
} from "../src/recordReplyOutcome";

function parseArgs(argv: string[]): {
  leadId: string | null;
  outcome: string | null;
  notes: string | undefined;
  followUpAt: Date | undefined;
} {
  let leadId: string | null = null;
  let outcome: string | null = null;
  let notes: string | undefined;
  let followUpAt: Date | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--outcome" && argv[i + 1]) {
      outcome = argv[i + 1];
      i += 1;
    } else if (a === "--notes" && argv[i + 1]) {
      notes = argv[i + 1];
      i += 1;
    } else if (a === "--follow-up-at" && argv[i + 1]) {
      const d = new Date(argv[i + 1]);
      if (!Number.isNaN(d.getTime())) followUpAt = d;
      i += 1;
    } else if (!a.startsWith("-") && leadId === null) {
      leadId = a;
    }
  }

  return { leadId, outcome, notes, followUpAt };
}

function printSnapshot(label: string, s: ReplyCheckSnapshot): void {
  console.log(`\n${label}`);
  console.log("  businessName:", s.businessName);
  console.log("  messageStatus:", s.messageStatus);
  console.log("  replyStatus:", s.replyStatus ?? "(null)");
  console.log("  replyOutcome:", s.replyOutcome ?? "(null)");
  console.log("  contactStatus:", s.contactStatus);
  console.log("  leadTemperature:", s.leadTemperature);
  console.log("  handoffRequired:", s.handoffRequired);
  console.log("  handoffReason:", s.handoffReason ?? "(null)");
  console.log("  nextAction:", s.nextAction ?? "(null)");
  console.log("  nextCheckAt:", s.nextCheckAt?.toISOString() ?? "(null)");
  console.log("  nextFollowUpAt:", s.nextFollowUpAt?.toISOString() ?? "(null)");
  console.log("  isArchived:", s.isArchived);
  console.log("  archivedReason:", s.archivedReason ?? "(null)");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { leadId, outcome, notes, followUpAt } = parseArgs(argv);

  if (!leadId) {
    console.error(
      `Usage: npm run reply:check -- "<leadId>" --outcome <${SUPPORTED_OUTCOMES.join("|")}> [--notes "text"] [--follow-up-at ISO-8601]`,
    );
    process.exit(1);
  }

  if (!outcome) {
    console.error('Missing --outcome. Example: --outcome asked-price');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const before = await prisma.lead.findUnique({
      where: { id: leadId },
      select: REPLY_CHECK_SNAPSHOT_SELECT,
    });

    if (!before) {
      console.error(`Error: Lead not found: ${leadId}`);
      process.exit(1);
    }

    printSnapshot("Before:", before);

    const after = await recordReplyOutcome(prisma, {
      leadId,
      outcome: outcome as ReplyOutcomeKey,
      replyNotes: notes,
      nextFollowUpAt: followUpAt,
    });

    printSnapshot("After:", after);

    console.log(
      "\n(Recorded locally only — no WhatsApp API, webhook, or auto-read.)",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
