import { PrismaClient } from "@prisma/client";
import { MESSAGE_TEMPLATES } from "./message-template-data";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  try {
    for (const row of MESSAGE_TEMPLATES) {
      const existing = await prisma.messageTemplate.findFirst({
        where: {
          name: row.name,
          industry: row.industry,
          leadLevel: row.leadLevel,
          messageStage: row.messageStage,
          language: row.language,
        },
      });

      if (!existing) {
        await prisma.messageTemplate.create({
          data: {
            name: row.name,
            industry: row.industry,
            leadLevel: row.leadLevel,
            messageStage: row.messageStage,
            language: row.language,
            body: row.body,
            isActive: true,
          },
        });
        created += 1;
        continue;
      }

      if (existing.body === row.body && existing.isActive) {
        unchanged += 1;
        continue;
      }

      await prisma.messageTemplate.update({
        where: { id: existing.id },
        data: {
          body: row.body,
          isActive: true,
        },
      });
      updated += 1;
    }

    console.log(
      JSON.stringify(
        {
          templatesDefined: MESSAGE_TEMPLATES.length,
          created,
          updated,
          unchanged,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
