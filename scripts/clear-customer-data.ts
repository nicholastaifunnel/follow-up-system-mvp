/**
 * Clears imported customer / lead data only.
 *
 * Dry-run (default): prints table names and row counts only. No DB writes.
 * Execute: npm run clear:customer-data -- --confirm CLEAR_CUSTOMER_DATA
 *
 * Preserves MessageTemplate, MessageTemplatePreset, ReplySopTemplate, auth/env,
 * and all system/template settings.
 */

import { PrismaClient } from "@prisma/client";

const CONFIRM_FLAG = "--confirm";
const CONFIRM_VALUE = "CLEAR_CUSTOMER_DATA";

const confirmIndex = process.argv.indexOf(CONFIRM_FLAG);
const hasConfirm =
  confirmIndex !== -1 && process.argv[confirmIndex + 1] === CONFIRM_VALUE;

type Snapshot = {
  lead: number;
  reviewPlanPeriod: number;
  importBatch: number;
  campaign: number;
  messageTemplate: number;
  messageTemplatePreset: number;
  replySopTemplate: number;
};

async function readCounts(db: PrismaClient): Promise<Snapshot> {
  const [
    lead,
    reviewPlanPeriod,
    importBatch,
    campaign,
    messageTemplate,
    messageTemplatePreset,
    replySopTemplate,
  ] = await Promise.all([
    db.lead.count(),
    db.reviewPlanPeriod.count(),
    db.importBatch.count(),
    db.campaign.count(),
    db.messageTemplate.count(),
    db.messageTemplatePreset.count(),
    db.replySopTemplate.count(),
  ]);

  return {
    lead,
    reviewPlanPeriod,
    importBatch,
    campaign,
    messageTemplate,
    messageTemplatePreset,
    replySopTemplate,
  };
}

function printSnapshot(label: string, s: Snapshot): void {
  console.log(`\n${label}`);
  console.log("-".repeat(64));
  console.log("Customer / lead data targeted for deletion:");
  console.log(`  ReviewPlanPeriod      ${s.reviewPlanPeriod}`);
  console.log(`  Lead                  ${s.lead}`);
  console.log(`  ImportBatch           ${s.importBatch}`);
  console.log(`  Campaign              ${s.campaign}`);
  console.log("\nPreserved system/template data:");
  console.log(`  MessageTemplate       ${s.messageTemplate}`);
  console.log(`  MessageTemplatePreset ${s.messageTemplatePreset}`);
  console.log(`  ReplySopTemplate      ${s.replySopTemplate}`);
}

function printSafetyNote(): void {
  console.log("Safe customer data cleanup");
  console.log("-".repeat(64));
  console.log("Delete order: ReviewPlanPeriod -> Lead -> ImportBatch -> Campaign");
  console.log("Preserves: message templates, template presets, Reply SOP templates.");
  console.log("Also preserves: auth/env settings and app configuration.");
}

async function main(): Promise<void> {
  const db = new PrismaClient();

  try {
    printSafetyNote();
    const before = await readCounts(db);
    printSnapshot("Current row counts:", before);

    if (!hasConfirm) {
      console.log("\nDry-run only: no database changes were made.");
      console.log(
        `To delete the customer data above, run: npm run clear:customer-data -- ${CONFIRM_FLAG} ${CONFIRM_VALUE}`,
      );
      return;
    }

    console.log("\nConfirmation accepted. Deleting customer data...");
    const [deletedReviewPlanPeriod, deletedLead, deletedImportBatch, deletedCampaign] =
      await db.$transaction([
        db.reviewPlanPeriod.deleteMany(),
        db.lead.deleteMany(),
        db.importBatch.deleteMany(),
        db.campaign.deleteMany(),
      ]);

    console.log("\nDeleted rows:");
    console.log(`  ReviewPlanPeriod      ${deletedReviewPlanPeriod.count}`);
    console.log(`  Lead                  ${deletedLead.count}`);
    console.log(`  ImportBatch           ${deletedImportBatch.count}`);
    console.log(`  Campaign              ${deletedCampaign.count}`);

    const after = await readCounts(db);
    printSnapshot("Counts after delete:", after);
    console.log("\nDone. System settings and templates were preserved.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
