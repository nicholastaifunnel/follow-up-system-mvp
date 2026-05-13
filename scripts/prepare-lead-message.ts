import { PrismaClient } from "@prisma/client";
import { prepareLeadMessage } from "../src/prepareLeadMessage";

async function main(): Promise<void> {
  const leadId = process.argv[2];
  if (!leadId) {
    console.error('Usage: npm run message:prepare -- "<leadId>"');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const r = await prepareLeadMessage(prisma, { leadId });
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
