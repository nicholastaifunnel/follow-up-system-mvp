import type { ReplyOutcomeKey } from "../../../../recordReplyOutcome";

export type SopLanguage = "en" | "zh";

export type GreetingStyle = "neutral" | "boss" | "none";

export type ReplyTypeId =
  | "asked-price"
  | "interested"
  | "ask-what-is-this"
  | "ask-for-example"
  | "need-boss-approval"
  | "later"
  | "not-interested"
  | "wrong-number"
  | "already-has-solution"
  | "stop-contacting";

export const REPLY_TYPE_OPTIONS: { id: ReplyTypeId; label: string }[] = [
  { id: "asked-price", label: "Asked price" },
  { id: "interested", label: "Interested" },
  { id: "ask-what-is-this", label: "Ask what is this" },
  { id: "ask-for-example", label: "Ask for example" },
  { id: "need-boss-approval", label: "Need boss approval" },
  { id: "later", label: "Later" },
  { id: "not-interested", label: "Not interested" },
  { id: "wrong-number", label: "Wrong number" },
  { id: "already-has-solution", label: "Already has solution" },
  { id: "stop-contacting", label: "Stop contacting" },
];

const RECORD_KEY: Record<ReplyTypeId, ReplyOutcomeKey> = {
  "asked-price": "asked-price",
  interested: "interested",
  "ask-what-is-this": "need-more-info",
  "ask-for-example": "need-more-info",
  "need-boss-approval": "follow-up-later",
  later: "follow-up-later",
  "not-interested": "not-interested",
  "wrong-number": "wrong-contact",
  "already-has-solution": "need-more-info",
  "stop-contacting": "not-interested",
};

export function recordKeyForReplyType(id: ReplyTypeId): ReplyOutcomeKey {
  return RECORD_KEY[id];
}

export function needsFollowUpDate(id: ReplyTypeId): boolean {
  return RECORD_KEY[id] === "follow-up-later";
}

/** Default “Ask contact name / role” per reply type (user can override until type changes). */
export function defaultAskContactNameRole(id: ReplyTypeId): boolean {
  switch (id) {
    case "later":
    case "not-interested":
    case "wrong-number":
    case "stop-contacting":
      return false;
    default:
      return true;
  }
}

function contactQuestionLine(replyTypeId: ReplyTypeId, lang: SopLanguage): string {
  if (replyTypeId === "need-boss-approval") {
    return lang === "zh"
      ? "顺便问一下，你是老板，还是负责店里 Google 资料的人？"
      : "By the way, are you the owner or the person handling the shop's Google profile?";
  }
  return lang === "zh"
    ? "顺便问一下，请问怎么称呼你？"
    : "By the way, may I know your name?";
}

function appendContactQuestion(
  core: string,
  replyTypeId: ReplyTypeId,
  lang: SopLanguage,
  includeContactQuestion: boolean,
): string {
  if (!includeContactQuestion) return core.trim();
  const q = contactQuestionLine(replyTypeId, lang);
  const base = core.trim();
  if (!base) return q;
  return `${base}\n\n${q}`.trim();
}

function greetingPrefix(lang: SopLanguage, style: GreetingStyle): string {
  if (style === "none") return "";
  if (lang === "zh") {
    if (style === "boss") return "您好，我代表店里老板跟进一下：";
    return "您好，感谢您的回复。";
  }
  if (style === "boss") {
    return "Hi — I'm following up from our shop on behalf of the owner: ";
  }
  return "Hi, thanks for your message. ";
}

function bodyForType(id: ReplyTypeId, lang: SopLanguage): string {
  if (lang === "zh") {
    switch (id) {
      case "asked-price":
        return "我们很乐意分享价格与套餐。请问您主要想了解哪一项服务？我可以发一份简要说明。";
      case "interested":
        return "太好了。您方便的话，我们约个简短电话或到店时间，我再为您详细介绍。";
      case "ask-what-is-this":
        return "这是关于我们之前发给您的推广/服务介绍。若您方便，我可以用一两句话说明我们提供什么，以及是否适合您。";
      case "ask-for-example":
        return "可以的。您想看哪一类案例（例如服务内容、价格区间或效果）？我发一个最接近您需求的示例给您参考。";
      case "need-boss-approval":
        return "了解，需要老板确认完全没问题。您看大概什么时候方便给答复？我也可以到时再礼貌提醒您。";
      case "later":
        return "没问题，我们晚点再联系您。若您有偏好的日期或时间段，请告诉我，我会按您的时间跟进。";
      case "not-interested":
        return "感谢您的回复。若以后有需要，欢迎随时再联系我们。";
      case "wrong-number":
        return "抱歉打扰到您。我们会更新记录，避免再次联系。";
      case "already-has-solution":
        return "了解，您这边已经有合适的方案也很好。若未来有需要，欢迎随时找我们。";
      case "stop-contacting":
        return "好的，我们这边先不再主动联系。感谢您的回复。";
    }
  }
  switch (id) {
    case "asked-price":
      return "Happy to share pricing and packages. Which service are you mainly interested in? I can send a short summary.";
    case "interested":
      return "That’s great. If it works for you, we can arrange a quick call or visit and I’ll walk you through the details.";
    case "ask-what-is-this":
      return "This is a follow-up about the message we sent earlier. If you’d like, I can briefly explain what we offer and whether it fits your needs.";
    case "ask-for-example":
      return "Sure — what kind of example would help most (service scope, pricing range, or results)? I’ll send the closest match.";
    case "need-boss-approval":
      return "Understood — needing the owner’s approval is totally fine. When do you expect you might have an answer? I can follow up gently around that time.";
    case "later":
      return "No problem — we can follow up later. If you have a preferred day or time window, tell me and I’ll align with it.";
    case "not-interested":
      return "Thanks for letting us know. If anything changes in the future, feel free to reach out anytime.";
    case "wrong-number":
      return "Sorry for the inconvenience. We’ll update our records so you’re not contacted again.";
    case "already-has-solution":
      return "Thanks for the update — glad you’re already sorted. If you ever need us in the future, we’re here to help.";
    case "stop-contacting":
      return "Understood — we won’t contact you again. Thank you for your time.";
  }
}

/** Fixed SOP text (no AI). Combines greeting + body; optionally appends name/role question. */
export function buildSopReply(
  replyTypeId: ReplyTypeId,
  lang: SopLanguage,
  greeting: GreetingStyle,
  includeContactQuestion: boolean,
): string {
  const g = greetingPrefix(lang, greeting);
  const b = bodyForType(replyTypeId, lang);
  const core = !g ? b.trim() : `${g}${b}`.trim();
  return appendContactQuestion(core, replyTypeId, lang, includeContactQuestion);
}
