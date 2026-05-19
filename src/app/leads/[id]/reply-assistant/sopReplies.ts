import type { ReplyOutcomeKey } from "../../../../recordReplyOutcome";

export type SopLanguage = "en" | "zh";

export type GreetingStyle = "neutral" | "boss" | "none";

export type ReplyTypeId =
  | "interested-ask-sample"
  | "asked-price"
  | "need-boss-approval-later"
  | "already-has-solution-objection"
  | "not-interested"
  | "wrong-number-stop-contacting";

export type LegacyReplyTypeId =
  | "interested"
  | "ask-what-is-this"
  | "ask-for-example"
  | "need-boss-approval"
  | "later"
  | "already-has-solution"
  | "wrong-number"
  | "stop-contacting";

export type ReplySopTemplateKey = ReplyTypeId | LegacyReplyTypeId;

export const REPLY_TYPE_OPTIONS: { id: ReplyTypeId; label: string }[] = [
  { id: "interested-ask-sample", label: "Interested / Ask Sample" },
  { id: "asked-price", label: "Asked price" },
  { id: "need-boss-approval-later", label: "Need Boss Approval / Later" },
  {
    id: "already-has-solution-objection",
    label: "Already Has Solution / Objection",
  },
  { id: "not-interested", label: "Not interested" },
  { id: "wrong-number-stop-contacting", label: "Wrong Number / Stop Contacting" },
];

const RECORD_KEY: Record<ReplyTypeId, ReplyOutcomeKey> = {
  "interested-ask-sample": "interested",
  "asked-price": "asked-price",
  "need-boss-approval-later": "follow-up-later",
  "already-has-solution-objection": "need-more-info",
  "not-interested": "not-interested",
  "wrong-number-stop-contacting": "wrong-contact",
};

export const LEGACY_REPLY_TYPE_KEY_MAP: Record<LegacyReplyTypeId, ReplyTypeId> = {
  interested: "interested-ask-sample",
  "ask-what-is-this": "interested-ask-sample",
  "ask-for-example": "interested-ask-sample",
  "need-boss-approval": "need-boss-approval-later",
  later: "need-boss-approval-later",
  "already-has-solution": "already-has-solution-objection",
  "wrong-number": "wrong-number-stop-contacting",
  "stop-contacting": "wrong-number-stop-contacting",
};

export function normalizeReplySopKey(key: string): ReplyTypeId | null {
  if (REPLY_TYPE_OPTIONS.some((opt) => opt.id === key)) {
    return key as ReplyTypeId;
  }
  return LEGACY_REPLY_TYPE_KEY_MAP[key as LegacyReplyTypeId] ?? null;
}

export function recordKeyForReplyType(id: ReplyTypeId): ReplyOutcomeKey {
  return RECORD_KEY[id];
}

export function needsFollowUpDate(id: ReplyTypeId): boolean {
  return RECORD_KEY[id] === "follow-up-later";
}

/** Default "Ask contact name / role" per reply type (user can override until type changes). */
export function defaultAskContactNameRole(id: ReplyTypeId): boolean {
  switch (id) {
    case "not-interested":
    case "wrong-number-stop-contacting":
      return false;
    default:
      return true;
  }
}

function contactQuestionLine(replyTypeId: ReplyTypeId, lang: SopLanguage): string {
  if (replyTypeId === "need-boss-approval-later") {
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
    return "Hi, I'm following up from our shop on behalf of the owner: ";
  }
  return "Hi, thanks for your message. ";
}

/** Code default SOP body (no greeting); used by DB sync and as fallback when no row. */
export function codeDefaultSopBody(id: ReplyTypeId, lang: SopLanguage): string {
  return bodyForType(id, lang);
}

function bodyForType(id: ReplyTypeId, lang: SopLanguage): string {
  if (lang === "zh") {
    switch (id) {
      case "interested-ask-sample":
        return "可以，我简单给你看。这个 system 是帮店家把 Google / Facebook review 流程变简单，让顾客更容易留下评价。如果你愿意，我可以先给你看 sample，或者帮你看看你现在的 review 流程适不适合用。";
      case "asked-price":
        return "现在是可以先试用 1 个月。之后如果继续用，月费 RM29，或者一年 RM199。你可以先试，不适合就不用继续。";
      case "need-boss-approval-later":
        return "可以，没问题。你先和老板/负责人确认。我迟一点再 follow up 你，不急。";
      case "already-has-solution-objection":
        return "明白。如果你们现在已经有方法也没问题。这个主要是让顾客更容易完成 review，也可以把 1-3 星的差评先收进后台，让老板知道哪里需要改善，不会直接公开出去。";
      case "not-interested":
        return "好的，没问题。谢谢你回复。如果之后有需要再找我就可以。";
      case "wrong-number-stop-contacting":
        return "不好意思打扰了，我会更新记录，不再联系这个号码。谢谢。";
    }
  }

  switch (id) {
    case "interested-ask-sample":
      return "Sure, I can show you briefly. This system helps local businesses make the Google / Facebook review flow easier, so happy customers can leave reviews with less friction. I can send a sample or quickly check whether your current review flow is suitable.";
    case "asked-price":
      return "You can try it free for 1 month first. After that, it is RM29 per month or RM199 per year if you want to continue. You can test first, and if it is not suitable, no need to continue.";
    case "need-boss-approval-later":
      return "No problem. Please check with your boss or the person in charge first. I can follow up later, no rush.";
    case "already-has-solution-objection":
      return "Understood. If you already have a method, that is totally fine. This mainly makes it easier for customers to complete a review, and 1-3 star feedback can go to the backend first so the owner can see what needs improving before it becomes public.";
    case "not-interested":
      return "No problem, thanks for replying. If you need it in the future, feel free to contact me.";
    case "wrong-number-stop-contacting":
      return "Sorry to disturb you. I will update the record and stop contacting this number. Thank you.";
  }
}

/** Fixed SOP text (no AI). Combines greeting + body; optionally appends name/role question. */
export function buildSopReply(
  replyTypeId: ReplyTypeId,
  lang: SopLanguage,
  greeting: GreetingStyle,
  includeContactQuestion: boolean,
  /** When non-empty after trim, use as SOP body instead of code default. */
  databaseBody?: string | null,
): string {
  const g = greetingPrefix(lang, greeting);
  const rawBody =
    databaseBody !== undefined &&
    databaseBody !== null &&
    databaseBody.trim().length > 0
      ? databaseBody.trim()
      : bodyForType(replyTypeId, lang);
  const b = rawBody;
  const core = !g ? b.trim() : `${g}${b}`.trim();
  return appendContactQuestion(core, replyTypeId, lang, includeContactQuestion);
}
