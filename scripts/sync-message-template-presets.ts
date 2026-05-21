import { PrismaClient } from "@prisma/client";
import {
  BASE_MESSAGE_STAGES,
  MESSAGE_TEMPLATE_VARIANT_STAGES,
  messageStageForVariant,
} from "../src/messageTemplatePresetStages";

const DEFAULT_PRESET_NAME = "Default Google Review";

const DEFAULT_BODIES: Record<(typeof BASE_MESSAGE_STAGES)[number], string> = {
  "First Message": `Hi, I found {businessName} on Google Maps.

I noticed a few simple things that could make your Google profile look more trusted and make it easier for new customers to contact you.

Can I send you 2 quick suggestions?`,
  "First Follow Up": `Hi, just following up about {businessName}.

One thing I noticed is that your Google profile could probably collect more reviews from happy customers.

A simple QR review flow can make it easier for customers to leave a review after visiting your shop.

Would you like me to show you a quick example?`,
  "Second Follow Up": `Hi, last follow up from me.

I'm currently helping a few local businesses test a simple Google Review system for free for the first month.

It helps make it easier for happy customers to leave Google reviews after they visit.

If improving {businessName}'s Google reviews is something you want to try later, feel free to let me know. No worries if now is not the right time.`,
};

const DEFAULT_TEMPLATES = MESSAGE_TEMPLATE_VARIANT_STAGES.map((messageStage) => {
  const baseStage = BASE_MESSAGE_STAGES.find((stage) =>
    messageStage.startsWith(stage),
  )!;
  return {
    name: `${DEFAULT_PRESET_NAME} - ${messageStage}`,
    messageStage,
    body:
      messageStage === messageStageForVariant(baseStage, 1)
        ? DEFAULT_BODIES[baseStage]
        : "",
  };
});

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  try {
    let preset = await prisma.messageTemplatePreset.findFirst({
      where: { name: DEFAULT_PRESET_NAME },
      include: { templates: true },
    });

    if (!preset) {
      preset = await prisma.messageTemplatePreset.create({
        data: { name: DEFAULT_PRESET_NAME },
        include: { templates: true },
      });
      created += 1;
    } else {
      unchanged += 1;
    }

    for (const row of DEFAULT_TEMPLATES) {
      const existing = preset.templates.find(
        (template) => template.messageStage === row.messageStage,
      );

      if (!existing) {
        const baseStage = BASE_MESSAGE_STAGES.find((stage) =>
          row.messageStage.startsWith(stage),
        );
        const legacyBody = baseStage
          ? preset.templates.find((template) => template.messageStage === baseStage)
              ?.body
          : undefined;
        await prisma.messageTemplate.create({
          data: {
            presetId: preset.id,
            name: row.name,
            messageStage: row.messageStage,
            body:
              row.body ||
              (baseStage && row.messageStage === messageStageForVariant(baseStage, 1)
                ? legacyBody || ""
                : ""),
            language: "en",
            isActive: true,
          },
        });
        created += 1;
        continue;
      }

      if (existing.body.trim().length === 0) {
        await prisma.messageTemplate.update({
          where: { id: existing.id },
          data: {
            body: row.body,
            isActive: true,
          },
        });
        updated += 1;
      } else {
        unchanged += 1;
      }
    }

    const activePreset = await prisma.messageTemplatePreset.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!activePreset) {
      await prisma.messageTemplatePreset.update({
        where: { id: preset.id },
        data: { isActive: true },
      });
      updated += 1;
    }

    console.log(
      JSON.stringify(
        {
          preset: DEFAULT_PRESET_NAME,
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
