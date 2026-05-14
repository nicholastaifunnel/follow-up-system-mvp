/**
 * Clears imported customer / lead data (Lead, ImportBatch, Campaign).
 * Preserves MessageTemplate, ReplySopTemplate, and schema.
 *
 * Dry-run (default): prints table names and row counts only — no PII, no DB writes.
 * Execute: npm run data:clear-customers -- --confirm
 */

import { PrismaClient } from "@prisma/client";

const CONFIRM = process.argv.includes("--confirm");

type Snapshot = {
  lead: number;
  importBatch: number;
  campaign: number;
  messageTemplate: number;
  replySopTemplate: number;
};

async function readCounts(db: PrismaClient): Promise<Snapshot> {
  const [lead, importBatch, campaign, messageTemplate, replySopTemplate] =
    await Promise.all([
      db.lead.count(),
      db.importBatch.count(),
      db.campaign.count(),
      db.messageTemplate.count(),
      db.replySopTemplate.count(),
    ]);
  return {
    lead,
    importBatch,
    campaign,
    messageTemplate,
    replySopTemplate,
  };
}

function printSnapshot(label: string, s: Snapshot): void {
  console.log(`\n${label}`);
  console.log("─".repeat(56));
  console.log("Will delete / deleted (customer & import data only):");
  console.log(`  Lead            ${s.lead}`);
  console.log(`  ImportBatch     ${s.importBatch}`);
  console.log(`  Campaign        ${s.campaign}`);
  console.log("Preserved (not modified by this script):");
  console.log(`  MessageTemplate ${s.messageTemplate}`);
  console.log(`  ReplySopTemplate ${s.replySopTemplate}`);
}

function printSchemaNote(): void {
  console.log("\nPrisma relations (read-only summary):");
  console.log(
    "  Lead → Campaign?, ImportBatch?, MessageTemplate? (FKs on Lead)",
  );
  console.log("  ImportBatch → Campaign?");
  console.log("  Campaign → MessageTemplate? (default template; rows kept)");
  console.log("  Delete order: Lead → ImportBatch → Campaign");
}

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const before = await readCounts(db);
    printSchemaNote();
    printSnapshot("Current row counts (counts only):", before);

    if (!CONFIRM) {
      console.log("\nDry-run: no database changes were made.");
      console.log(
        'To delete the rows above, run: npm run data:clear-customers -- --confirm',
      );
      return;
    }

    console.log("\n--confirm: starting deleteMany in transaction…");
    const [delLead, delBatch, delCampaign] = await db.$transaction([
      db.lead.deleteMany(),
      db.importBatch.deleteMany(),
      db.campaign.deleteMany(),
    ]);

    console.log("Deleted rows (reported counts only):");
    console.log(`  Lead            ${delLead.count}`);
    console.log(`  ImportBatch     ${delBatch.count}`);
    console.log(`  Campaign        ${delCampaign.count}`);

    const after = await readCounts(db);
    printSnapshot("Counts after delete:", after);
    console.log("\nDone. MessageTemplate and ReplySopTemplate were not deleted.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
