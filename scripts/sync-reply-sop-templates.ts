import { PrismaClient } from "@prisma/client";
import {
  REPLY_TYPE_OPTIONS,
  codeDefaultSopBody,
  type ReplyTypeId,
  type SopLanguage,
} from "../src/app/leads/[id]/reply-assistant/sopReplies";

const LANGUAGES: SopLanguage[] = ["en", "zh"];

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  try {
    for (const opt of REPLY_TYPE_OPTIONS) {
      const key = opt.id as ReplyTypeId;
      for (const language of LANGUAGES) {
        const body = codeDefaultSopBody(key, language);
        const label = opt.label;

        const existing = await prisma.replySopTemplate.findUnique({
          where: {
            key_language: { key, language },
          },
        });

        if (!existing) {
          await prisma.replySopTemplate.create({
            data: {
              key,
              language,
              label,
              body,
              isActive: true,
            },
          });
          created += 1;
          continue;
        }

        if (existing.body === body && existing.label === label) {
          unchanged += 1;
          continue;
        }

        await prisma.replySopTemplate.update({
          where: { id: existing.id },
          data: { body, label },
        });
        updated += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          replyTypes: REPLY_TYPE_OPTIONS.length,
          languages: LANGUAGES.length,
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
