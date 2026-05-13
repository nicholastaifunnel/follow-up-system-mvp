import * as path from "node:path";
import {
  ExcelPreviewError,
  previewExcelImport,
} from "../src/excelImportPreview";

function printSection(title: string): void {
  console.log("\n" + "=".repeat(64));
  console.log(title);
  console.log("=".repeat(64));
}

function main(): void {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      'Usage: npm run import:preview -- "<path-to-file.xlsx>"\nExample: npm run import:preview -- "./fixtures/sample-import.xlsx"',
    );
    process.exit(1);
  }

  const filePath = path.resolve(arg);

  let result;
  try {
    result = previewExcelImport(filePath);
  } catch (e) {
    if (e instanceof ExcelPreviewError) {
      console.error("Error:", e.message);
      process.exit(1);
    }
    throw e;
  }

  printSection("Detected campaign");
  console.log("Source keyword:", result.campaign.sourceKeyword || "(none)");
  console.log("Area:", result.campaign.area || "(none)");
  console.log("Suggested campaign name:", result.campaign.suggestedCampaignName);

  printSection("Summary");
  const s = result.summary;
  console.log("Total rows:", s.totalRows);
  console.log("Rows with phone:", s.rowsWithPhone);
  console.log("Rows without phone:", s.rowsWithoutPhone);
  console.log("Rows with website:", s.rowsWithWebsite);
  console.log("Rows with social link:", s.rowsWithSocialLink);
  console.log("Rows with place id:", s.rowsWithPlaceId);
  console.log("High priority count:", s.highPriorityCount);
  console.log("Suitable lead count:", s.suitableLeadCount);

  printSection("Suggested industry (from keyword / name / Category only)");
  for (const [k, v] of Object.entries(result.industryCounts)) {
    console.log(`  ${k}: ${v}`);
  }

  printSection("Lead level");
  for (const [k, v] of Object.entries(result.leadLevelCounts)) {
    console.log(`  ${k}: ${v}`);
  }

  printSection("Outreach readiness");
  for (const [k, v] of Object.entries(result.outreachReadinessCounts)) {
    console.log(`  ${k}: ${v}`);
  }

  printSection(`First sheet: "${result.sheetName}" — preview (first 20 rows)`);
  const cols = [
    "Business Name",
    "Category→google",
    "Phone",
    "Suggested industry",
    "Lead level",
    "Readiness",
    "Priority",
  ] as const;
  const table = result.previewRows.map((r) => ({
    [cols[0]]: r.businessName.slice(0, 28),
    [cols[1]]: r.googleCategory.slice(0, 20),
    [cols[2]]: (r.phone || r.internationalPhone).slice(0, 16),
    [cols[3]]: r.suggestedIndustry,
    [cols[4]]: r.leadLevel,
    [cols[5]]: r.outreachReadiness,
    [cols[6]]: r.priority.slice(0, 10),
  }));
  console.table(table);

  console.log("\n(No database writes; preview only.)");
}

main();
