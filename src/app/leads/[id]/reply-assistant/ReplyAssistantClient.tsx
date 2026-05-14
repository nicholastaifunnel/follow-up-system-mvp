"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { recordReplyOutcomeAction } from "../actions";
import { buildWhatsAppMeUrl } from "@/lib/digitsForWaMe";
import type { ReplyOutcomeKey } from "@/recordReplyOutcome";

/** UI values; mapped to {@link ReplyOutcomeKey} on save (no new Prisma fields). */
const OUTCOME_SELECT = [
  { value: "asked-price", label: "Asked price", recordKey: "asked-price" as const },
  { value: "interested", label: "Interested", recordKey: "interested" as const },
  {
    value: "not-interested",
    label: "Not interested",
    recordKey: "not-interested" as const,
  },
  {
    value: "follow-up-later",
    label: "Follow up later",
    recordKey: "follow-up-later" as const,
  },
  {
    value: "wrong-number",
    label: "Wrong number",
    recordKey: "wrong-contact" as const,
  },
  {
    value: "already-has-solution",
    label: "Already has solution",
    recordKey: "not-interested" as const,
  },
  { value: "stop", label: "Stop", recordKey: "not-interested" as const },
] as const;

type UiOutcome = (typeof OUTCOME_SELECT)[number]["value"];

const SUGGESTED_REPLIES: Record<UiOutcome, string> = {
  "asked-price":
    "Thanks for reaching out! I’d be happy to share our pricing and packages. What service are you most interested in?",
  interested:
    "Great to hear you’re interested! When would be a good time for a quick call or visit?",
  "not-interested":
    "Thanks for letting us know. If anything changes in the future, feel free to message us anytime.",
  "follow-up-later":
    "No problem — I’ll follow up with you later. Is there a preferred day or time that works best?",
  "wrong-number":
    "Sorry for the inconvenience if we reached the wrong person. We’ll update our records.",
  "already-has-solution":
    "Thanks for the update — glad you’re sorted. If you ever need us again, we’re here to help.",
  stop:
    "Understood — we won’t contact you again. Thank you for your time.\n\n好的，我们不再打扰您。感谢您的回复。",
};

function recordKeyForUi(ui: string): ReplyOutcomeKey {
  const row = OUTCOME_SELECT.find((o) => o.value === ui);
  return row ? row.recordKey : "asked-price";
}

function buildReplyAssistantNotes(
  customerReply: string,
  suggestedReply: string,
): string {
  const cr = customerReply.trim();
  const sr = suggestedReply.trim();
  return [
    "Customer reply:",
    cr.length ? cr : "(none)",
    "",
    "Suggested reply sent:",
    sr.length ? sr : "(none)",
  ].join("\n");
}

type Props = {
  leadId: string;
  businessName: string;
  phone: string | null;
  internationalPhone: string | null;
  area: string | null;
  assignedIndustry: string | null;
  leadLevel: string | null;
  messageStatus: string;
  replyStatus: string | null;
  contactStatus: string;
  nextAction: string | null;
  preparedMessage: string | null;
  canRecordReply: boolean;
  recordReplyBlockedReason: string;
};

export function ReplyAssistantClient(props: Props) {
  const {
    leadId,
    businessName,
    phone,
    internationalPhone,
    area,
    assignedIndustry,
    leadLevel,
    messageStatus,
    replyStatus,
    contactStatus,
    nextAction,
    preparedMessage,
    canRecordReply,
    recordReplyBlockedReason,
  } = props;

  const router = useRouter();
  const [customerReply, setCustomerReply] = useState("");
  const [outcome, setOutcome] = useState<UiOutcome>("interested");
  const [followUpAt, setFollowUpAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const suggestedReply = SUGGESTED_REPLIES[outcome] ?? "";

  const waHref = useMemo(
    () =>
      buildWhatsAppMeUrl(phone, internationalPhone, suggestedReply),
    [phone, internationalPhone, suggestedReply],
  );

  function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canRecordReply) return;
    setError(null);
    setSaved(false);
    const recordKey = recordKeyForUi(outcome);
    const notesPayload = buildReplyAssistantNotes(customerReply, suggestedReply);
    startTransition(() => {
      void recordReplyOutcomeAction({
        leadId,
        outcome: recordKey,
        replyNotes: notesPayload,
        nextFollowUpAtISO:
          outcome === "follow-up-later" && followUpAt.trim() !== ""
            ? followUpAt
            : null,
      }).then((result) => {
        if (result.ok) {
          setSaved(true);
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  function fmt(v: string | null | undefined): string {
    if (v === null || v === undefined || v === "") return "—";
    return v;
  }

  const preparedTrim = (preparedMessage ?? "").trim();

  return (
    <div className="reply-assistant-layout">
      <section className="detail-card">
        <h2>Customer summary</h2>
        <div className="kv-list">
          <div className="kv-row">
            <span className="kv-label">Business</span>
            <span className="kv-value">{fmt(businessName)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Phone</span>
            <span className="kv-value">{fmt(phone)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">International phone</span>
            <span className="kv-value">{fmt(internationalPhone)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Area</span>
            <span className="kv-value">{fmt(area)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Assigned industry</span>
            <span className="kv-value">{fmt(assignedIndustry)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Lead level</span>
            <span className="kv-value">{fmt(leadLevel)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Message status</span>
            <span className="kv-value">{fmt(messageStatus)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Reply status</span>
            <span className="kv-value">{fmt(replyStatus)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Contact status</span>
            <span className="kv-value">{fmt(contactStatus)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Next action</span>
            <span className="kv-value">{fmt(nextAction)}</span>
          </div>
        </div>
      </section>

      {preparedTrim.length > 0 ? (
        <section className="detail-card">
          <h2>Prepared message</h2>
          <div className="message-box">
            <pre>{preparedMessage}</pre>
          </div>
        </section>
      ) : null}

      <section className="detail-card">
        <h2>Draft reply</h2>
        <form className="reply-assistant-form" onSubmit={onSave}>
          <div className="reply-form-row">
            <label className="reply-form-label" htmlFor="customer-reply">
              Customer reply
            </label>
            <textarea
              id="customer-reply"
              className="reply-form-textarea"
              rows={4}
              value={customerReply}
              onChange={(e) => setCustomerReply(e.target.value)}
              disabled={isPending}
              placeholder="Paste or summarize what the customer said…"
            />
          </div>

          <div className="reply-form-row">
            <label className="reply-form-label" htmlFor="reply-outcome">
              Reply outcome
            </label>
            <select
              id="reply-outcome"
              className="reply-form-select"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as UiOutcome)}
              disabled={isPending}
            >
              {OUTCOME_SELECT.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {outcome === "follow-up-later" ? (
            <div className="reply-form-row">
              <label className="reply-form-label" htmlFor="followup-local">
                Next follow-up
              </label>
              <input
                id="followup-local"
                type="datetime-local"
                className="reply-form-input"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                disabled={isPending}
              />
            </div>
          ) : null}

          <div className="reply-form-row">
            <span className="reply-form-label">Suggested reply</span>
            <div className="reply-assistant-suggested">{suggestedReply}</div>
          </div>

          <div className="reply-form-actions reply-assistant-actions">
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="open-whatsapp-btn open-whatsapp-btn-primary"
              >
                Open WhatsApp
              </a>
            ) : (
              <span className="open-whatsapp-hint">
                No usable phone for WhatsApp.
              </span>
            )}

            {canRecordReply ? (
              <button type="submit" className="reply-form-submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save outcome"}
              </button>
            ) : (
              <p className="reply-outcome-blocked">{recordReplyBlockedReason}</p>
            )}
          </div>
        </form>

        {error ? <p className="reply-form-error">{error}</p> : null}
        {saved ? <p className="reply-form-saved">Saved</p> : null}
      </section>
    </div>
  );
}
