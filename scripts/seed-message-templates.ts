import { PrismaClient } from "@prisma/client";

type SeedRow = {
  name: string;
  industry: string | null;
  leadLevel: string | null;
  messageStage: string;
  language: string;
  body: string;
};

const TEMPLATES: SeedRow[] = [
  {
    name: "First Message — 采耳 / 头疗 — No Website (EN)",
    industry: "采耳 / 头疗",
    leadLevel: "No Website",
    messageStage: "First Message",
    language: "en",
    body: `Hi {businessName}, I found your business on Google while looking around {area}. I noticed you have a Google listing, but I couldn’t find a proper website or landing page.

I help local businesses create simple pages that make it easier for customers to understand your services and contact you.

Would it be okay if I send you a quick example?`,
  },
  {
    name: "First Message — 采耳 / 头疗 — Low Review (EN)",
    industry: "采耳 / 头疗",
    leadLevel: "Low Review",
    messageStage: "First Message",
    language: "en",
    body: `Hi {businessName}, I found your business on Google while looking around {area}. I noticed your review count is still quite low compared to what a good local business could have.

I help businesses make it easier for happy customers to leave reviews using a simple QR-based review flow.

Would it be okay if I send you a quick example?`,
  },
  {
    name: "First Message — Beauty Salon — No Website (EN)",
    industry: "Beauty Salon",
    leadLevel: "No Website",
    messageStage: "First Message",
    language: "en",
    body: `Hi {businessName}, I found your beauty business on Google while looking around {area}. I noticed you have a Google listing, but I couldn’t find a clear website or landing page.

I help local beauty businesses create simple pages that make it easier for customers to view services and contact you.

Would it be okay if I send you a quick example?`,
  },
  {
    name: "First Message — Spa / Massage — No Website (EN)",
    industry: "Spa / Massage",
    leadLevel: "No Website",
    messageStage: "First Message",
    language: "en",
    body: `Hi {businessName}, I found your spa business on Google while looking around {area}. I noticed you have a Google listing, but I couldn’t find a clear website or landing page.

I help local service businesses create simple pages that make it easier for customers to understand your services and contact you.

Would it be okay if I send you a quick example?`,
  },
  {
    name: "First Message — Fallback (EN)",
    industry: null,
    leadLevel: null,
    messageStage: "First Message",
    language: "en",
    body: `Hi {businessName}, I found your business on Google while looking around {area}.

I help local businesses improve their online presence so customers can understand their services and contact them more easily.

Would it be okay if I send you a quick example?`,
  },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let created = 0;
  let skipped = 0;

  try {
    for (const row of TEMPLATES) {
      const existing = await prisma.messageTemplate.findFirst({
        where: {
          name: row.name,
          industry: row.industry,
          leadLevel: row.leadLevel,
          messageStage: row.messageStage,
          language: row.language,
        },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

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
    }

    console.log(
      JSON.stringify(
        { templatesDefined: TEMPLATES.length, created, skipped },
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
