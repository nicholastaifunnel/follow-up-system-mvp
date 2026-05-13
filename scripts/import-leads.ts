import * as path from "node:path";
import { PrismaClient } from "@prisma/client";
import { ExcelPreviewError } from "../src/excelImportPreview";
import { importLeadsFromExcel } from "../src/importLeadsFromExcel";

function printSection(title: string): void {
  console.log("\n" + "=".repeat(64));
  console.log(title);
  console.log("=".repeat(64));
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      'Usage: npm run import:leads -- "<path-to-file.xlsx>"',
    );
    process.exit(1);
  }

  const filePath = path.resolve(arg);
  const prisma = new PrismaClient();

  try {
    const r = await importLeadsFromExcel(prisma, filePath);

    printSection("Import complete");
    console.log("Campaign name:", r.campaignName);
    console.log("Import batch id:", r.importBatchId);
    console.log("Total rows (sheet data rows):", r.totalRows);
    console.log("Inserted:", r.insertedCount);
    console.log("Updated:", r.updatedCount);
    console.log("Duplicates (matched existing):", r.duplicateCount);
    console.log("Skipped (no Business Name):", r.skippedCount);
    console.log("Missing phone (non-skipped rows):", r.missingPhoneCount);
    console.log("Missing website (non-skipped rows):", r.missingWebsiteCount);
    console.log("Missing social link (non-skipped rows):", r.missingSocialCount);

    printSection("Industry summary (imported rows)");
    for (const [k, v] of Object.entries(r.industryCounts)) {
      console.log(`  ${k}: ${v}`);
    }

    printSection("Lead level summary");
    for (const [k, v] of Object.entries(r.leadLevelCounts)) {
      console.log(`  ${k}: ${v}`);
    }

    printSection("Outreach readiness summary");
    for (const [k, v] of Object.entries(r.outreachReadinessCounts)) {
      console.log(`  ${k}: ${v}`);
    }

    console.log("\n(rawRowJson stored in DB is not printed here.)");
  } catch (e) {
    if (e instanceof ExcelPreviewError) {
      console.error("Error:", e.message);
      process.exit(1);
    }
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
