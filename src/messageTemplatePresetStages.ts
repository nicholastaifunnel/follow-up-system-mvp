export const BASE_MESSAGE_STAGES = [
  "First Message",
  "First Follow Up",
  "Second Follow Up",
] as const;

export type BaseMessageStage = (typeof BASE_MESSAGE_STAGES)[number];

export const MESSAGE_TEMPLATE_VARIANTS = [1, 2, 3] as const;

export type MessageTemplateVariant = (typeof MESSAGE_TEMPLATE_VARIANTS)[number];

export const MESSAGE_TEMPLATE_STAGE_GROUPS = [
  {
    baseStage: "First Message",
    label: "First Message",
    hint:
      "第一次发给商家的 message，目标是让对方愿意回复。",
    stages: [
      "First Message V1",
      "First Message V2",
      "First Message V3",
    ],
  },
  {
    baseStage: "First Follow Up",
    label: "First Follow Up",
    hint:
      "1-2 天后跟进，目标是提醒对方看 example 或 sample。",
    stages: [
      "First Follow Up V1",
      "First Follow Up V2",
      "First Follow Up V3",
    ],
  },
  {
    baseStage: "Second Follow Up",
    label: "Second Follow Up",
    hint: "最后一次礼貌跟进，不要追太紧。",
    stages: [
      "Second Follow Up V1",
      "Second Follow Up V2",
      "Second Follow Up V3",
    ],
  },
] as const;

export const MESSAGE_TEMPLATE_VARIANT_STAGES =
  MESSAGE_TEMPLATE_STAGE_GROUPS.flatMap((group) => group.stages);

export type MessageTemplateVariantStage =
  (typeof MESSAGE_TEMPLATE_VARIANT_STAGES)[number];

export function messageStageForVariant(
  baseStage: BaseMessageStage,
  variant: MessageTemplateVariant,
): MessageTemplateVariantStage {
  return `${baseStage} V${variant}` as MessageTemplateVariantStage;
}

export function normalizeBaseMessageStage(stage: string): BaseMessageStage {
  if (stage === "First Follow Up") return "First Follow Up";
  if (stage === "Second Follow Up") return "Second Follow Up";
  return "First Message";
}
