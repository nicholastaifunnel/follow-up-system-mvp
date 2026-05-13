import { PrismaClient } from "@prisma/client";
import { getFollowUpQueue } from "../src/getFollowUpQueue";

function parseLimit(argv: string[]): number | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      const n = parseInt(argv[i + 1], 10);
      return Number.isFinite(n) ? n : undefined;
    }
  }
  return undefined;
}

function printSection(title: string, group: { count: number; leads: unknown[] }): void {
  console.log("\n" + "=".repeat(72));
  console.log(`${title} — count: ${group.count} (showing up to ${group.leads.length})`);
  console.log("=".repeat(72));
  if (!group.leads.length) {
    console.log("(no rows)");
    return;
  }
  console.table(group.leads);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const limit = parseLimit(argv);

  const prisma = new PrismaClient();
  try {
    const q = await getFollowUpQueue(
      prisma,
      limit !== undefined ? { limit } : undefined,
    );

    printSection(
      "A. dueToday (nextFollowUpAt within local today, not archived)",
      q.dueToday,
    );
    printSection(
      "B. overdue (nextFollowUpAt before local today start, not archived)",
      q.overdue,
    );
    printSection(
      'C. noReplyToCheck (replyStatus No Reply Yet / Waiting Reply, nextCheckAt <= now, not archived)',
      q.noReplyToCheck,
    );
    printSection("D. needHuman (handoffRequired, not archived)", q.needHuman);
    printSection(
      'E. followUpLater (contactStatus "Follow Up", not archived)',
      q.followUpLater,
    );

    console.log("\n(Read-only follow-up queue — no DB writes.)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
