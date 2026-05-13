import { PrismaClient } from "@prisma/client";
import { prepareLeadMessage } from "../src/prepareLeadMessage";

function parseArgs(argv: string[]): { leadId: string | null; force: boolean } {
  const force = argv.includes("--force");
  const positional = argv.filter((a) => a !== "--force");
  const leadId = positional[0] ?? null;
  return { leadId, force };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { leadId, force } = parseArgs(argv);

  if (!leadId) {
    console.error(
      'Usage: npm run message:prepare -- "<leadId>" [--force]',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const r = await prepareLeadMessage(prisma, { leadId, force });
    console.log("Business name:", r.businessName);
    console.log("Assigned industry:", r.assignedIndustry ?? "(null)");
    console.log("Lead level:", r.leadLevel ?? "(null)");
    console.log("Selected template:", r.templateName);
    console.log("");
    console.log("Prepared message:");
    console.log(r.preparedMessage);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
