"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { recordReplyOutcomeAction } from "../actions";
import { buildWhatsAppMeUrl } from "@/lib/digitsForWaMe";
import type { ReplyOutcomeKey } from "@/recordReplyOutcome";
import {
  type GreetingStyle,
  type ReplyTypeId,
  type SopLanguage,
  REPLY_TYPE_OPTIONS,
  buildSopReply,
  defaultAskContactNameRole,
  needsFollowUpDate,
  recordKeyForReplyType,
} from "./sopReplies";

function buildReplyAssistantNotes(replyTypeLabel: string, sopReply: string): string {
  const label = replyTypeLabel.trim();
  const sr = sopReply.trim();
  return [
    "Reply type:",
    label.length ? label : "—",
    "",
    "SOP reply sent:",
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
  /** `${replyTypeKey}:${language}` → DB body (no greeting); missing key uses code default. */
  sopDatabaseBodies: Record<string, string>;
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
    sopDatabaseBodies,
  } = props;

  const router = useRouter();
  const [replyTypeId, setReplyTypeId] = useState<ReplyTypeId>("interested");
  const [language, setLanguage] = useState<SopLanguage>("en");
  const [greetingStyle, setGreetingStyle] = useState<GreetingStyle>("neutral");
  const [askContactNameRole, setAskContactNameRole] = useState(() =>
    defaultAskContactNameRole("interested"),
  );
  const [followUpAt, setFollowUpAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const databaseBody = sopDatabaseBodies[`${replyTypeId}:${language}`] ?? null;

  const sopReply = useMemo(
    () =>
      buildSopReply(
        replyTypeId,
        language,
        greetingStyle,
        askContactNameRole,
        databaseBody,
      ),
    [
      replyTypeId,
      language,
      greetingStyle,
      askContactNameRole,
      databaseBody,
    ],
  );

  const waHref = useMemo(
    () => buildWhatsAppMeUrl(phone, internationalPhone, sopReply),
    [phone, internationalPhone, sopReply],
  );

  const showFollowUpField = needsFollowUpDate(replyTypeId);

  const onCopyReply = useCallback(async () => {
    const text = sopReply.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [sopReply]);

  function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canRecordReply) return;
    setError(null);
    setSaved(false);
    const recordKey: ReplyOutcomeKey = recordKeyForReplyType(replyTypeId);
    const typeLabel =
      REPLY_TYPE_OPTIONS.find((o) => o.id === replyTypeId)?.label ?? replyTypeId;
    const notesPayload = buildReplyAssistantNotes(typeLabel, sopReply);
    startTransition(() => {
      void recordReplyOutcomeAction({
        leadId,
        outcome: recordKey,
        replyNotes: notesPayload,
        nextFollowUpAtISO:
          showFollowUpField && followUpAt.trim() !== "" ? followUpAt : null,
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
    <div className="reply-assistant-layout sop-assistant">
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

      <section className="detail-card sop-build-card">
        <h2>SOP reply builder</h2>
        <p className="sop-build-hint">
          Pick reply type, language, and greeting — then copy or open WhatsApp, and save the outcome. SOP bodies come from Reply SOP Settings (with code fallback if a template is missing).
        </p>

        <div className="sop-select-row">
          <div className="reply-form-row sop-select-field">
            <label className="reply-form-label" htmlFor="sop-lang">
              Language
            </label>
            <select
              id="sop-lang"
              className="reply-form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SopLanguage)}
              disabled={isPending}
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div className="reply-form-row sop-select-field">
            <label className="reply-form-label" htmlFor="sop-greet">
              Greeting style
            </label>
            <select
              id="sop-greet"
              className="reply-form-select"
              value={greetingStyle}
              onChange={(e) => setGreetingStyle(e.target.value as GreetingStyle)}
              disabled={isPending}
            >
              <option value="neutral">Neutral</option>
              <option value="boss">Boss / 老板</option>
              <option value="none">No greeting</option>
            </select>
          </div>
        </div>

        <div className="reply-form-row">
          <span className="reply-form-label">Reply type</span>
          <div className="sop-type-grid" role="group" aria-label="Reply type">
            {REPLY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={
                  replyTypeId === opt.id
                    ? "sop-type-btn sop-type-btn-active"
                    : "sop-type-btn"
                }
                onClick={() => {
                  setReplyTypeId(opt.id);
                  setAskContactNameRole(defaultAskContactNameRole(opt.id));
                }}
                disabled={isPending}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sop-ask-contact-row">
          <label className="sop-ask-contact-label">
            <input
              type="checkbox"
              className="sop-ask-contact-checkbox"
              checked={askContactNameRole}
              onChange={(e) => setAskContactNameRole(e.target.checked)}
              disabled={isPending}
            />
            <span>Ask contact name / role</span>
          </label>
        </div>
      </section>

      <section className="detail-card sop-recommended-card">
        <h2>Recommended reply</h2>
        <div className="sop-recommended-body">
          <pre className="sop-recommended-pre">{sopReply}</pre>
        </div>
        <div className="sop-recommended-actions">
          <button
            type="button"
            className="sop-copy-btn"
            onClick={() => void onCopyReply()}
            disabled={isPending || !sopReply.trim()}
          >
            {copied ? "Copied" : "Copy reply"}
          </button>
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
            <span className="open-whatsapp-hint">No usable phone for WhatsApp.</span>
          )}
        </div>
      </section>

      <section className="detail-card sop-save-card">
        <h2>Save outcome</h2>
        <form className="reply-assistant-form" onSubmit={onSave}>
          {showFollowUpField ? (
            <div className="reply-form-row">
              <label className="reply-form-label" htmlFor="followup-local">
                Next follow-up (optional)
              </label>
              <input
                id="followup-local"
                type="datetime-local"
                className="reply-form-input sop-datetime-input"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                disabled={isPending}
              />
            </div>
          ) : null}

          <div className="reply-form-actions reply-assistant-actions">
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
