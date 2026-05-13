import { PrismaClient } from "@prisma/client";
import { getMessageQueue } from "../src/getMessageQueue";

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
    const q = await getMessageQueue(prisma, limit !== undefined ? { limit } : undefined);

    printSection("A. notPrepared (Not Prepared + Ready + not archived)", q.notPrepared);
    printSection("B. preparedNotSent (Prepared + not archived)", q.preparedNotSent);
    printSection("C. firstMessageSent (First Message Sent + not archived)", q.firstMessageSent);
    printSection("D. waitingReply (Waiting Reply + not archived)", q.waitingReply);
    printSection("E. needHuman (handoffRequired + not archived)", q.needHuman);

    console.log("\n(Read-only queue view — no DB writes.)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
