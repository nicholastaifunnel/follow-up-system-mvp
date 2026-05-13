export type SeedMessageTemplate = {
  name: string;
  industry: string | null;
  leadLevel: string | null;
  messageStage: string;
  language: string;
  body: string;
};

const NEW_MESSAGE_EN = `Hi, I found {businessName} on Google Maps.

I noticed a few simple things that could make your Google profile look more trusted and make it easier for new customers to contact you.

Can I send you 2 quick suggestions?`;

const NEW_MESSAGE_ZH = `你好，我刚刚在 Google Maps 看到 {businessName}。

我发现有几个小地方可以让你的 Google 资料看起来更有信任感，也更容易让新顾客联系你。

我可以发你 2 个简单建议吗？`;

const FIRST_FOLLOW_UP_EN = `Hi, just following up about {businessName}.

One thing I noticed is that your Google profile could probably collect more reviews from happy customers.

A simple QR review flow can make it easier for customers to leave a review after visiting your shop.

Would you like me to show you a quick example?`;

const FIRST_FOLLOW_UP_ZH = `你好，我再跟进一下关于 {businessName}。

我主要看到的是，你的 Google 资料其实可以更稳定地增加好评。很多满意顾客愿意支持，只是没有一个简单流程提醒他们留下 review。

我可以发你一个简单 example 看看吗？`;

const SECOND_FOLLOW_UP_EN = `Hi, last follow up from me.

I'm currently helping a few local businesses test a simple Google Review system for free for the first month.

It helps make it easier for happy customers to leave Google reviews after they visit.

If improving {businessName}'s Google reviews is something you want to try later, feel free to let me know. No worries if now is not the right time.`;

const SECOND_FOLLOW_UP_ZH = `你好，这是我最后一次跟进。

我现在有帮几间本地商家免费测试一个简单的 Google Review 系统，第一个月免费，主要是让满意顾客更容易留下 Google 好评。

如果你之后想加强 {businessName} 的 Google Review，可以再告诉我。现在不方便也没关系。`;

const FIRST_MESSAGE_TARGETS = [
  {
    nameEn: "First Message — 采耳 / 头疗 — No Website (EN)",
    nameZh: "First Message — 采耳 / 头疗 — No Website (ZH)",
    industry: "采耳 / 头疗",
    leadLevel: "No Website",
  },
  {
    nameEn: "First Message — 采耳 / 头疗 — Low Review (EN)",
    nameZh: "First Message — 采耳 / 头疗 — Low Review (ZH)",
    industry: "采耳 / 头疗",
    leadLevel: "Low Review",
  },
  {
    nameEn: "First Message — Beauty Salon — No Website (EN)",
    nameZh: "First Message — Beauty Salon — No Website (ZH)",
    industry: "Beauty Salon",
    leadLevel: "No Website",
  },
  {
    nameEn: "First Message — Spa / Massage — No Website (EN)",
    nameZh: "First Message — Spa / Massage — No Website (ZH)",
    industry: "Spa / Massage",
    leadLevel: "No Website",
  },
  {
    nameEn: "First Message — Fallback (EN)",
    nameZh: "First Message — Fallback (ZH)",
    industry: null,
    leadLevel: null,
  },
] as const;

export const MESSAGE_TEMPLATES: SeedMessageTemplate[] = [
  ...FIRST_MESSAGE_TARGETS.flatMap((target) => [
    {
      name: target.nameEn,
      industry: target.industry,
      leadLevel: target.leadLevel,
      messageStage: "First Message",
      language: "en",
      body: NEW_MESSAGE_EN,
    },
    {
      name: target.nameZh,
      industry: target.industry,
      leadLevel: target.leadLevel,
      messageStage: "First Message",
      language: "zh",
      body: NEW_MESSAGE_ZH,
    },
  ]),
  {
    name: "First Follow Up - Fallback (EN)",
    industry: null,
    leadLevel: null,
    messageStage: "First Follow Up",
    language: "en",
    body: FIRST_FOLLOW_UP_EN,
  },
  {
    name: "First Follow Up - Fallback (ZH)",
    industry: null,
    leadLevel: null,
    messageStage: "First Follow Up",
    language: "zh",
    body: FIRST_FOLLOW_UP_ZH,
  },
  {
    name: "Second Follow Up - Fallback (EN)",
    industry: null,
    leadLevel: null,
    messageStage: "Second Follow Up",
    language: "en",
    body: SECOND_FOLLOW_UP_EN,
  },
  {
    name: "Second Follow Up - Fallback (ZH)",
    industry: null,
    leadLevel: null,
    messageStage: "Second Follow Up",
    language: "zh",
    body: SECOND_FOLLOW_UP_ZH,
  },
];
