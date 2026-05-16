"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePreparedMessageDraftAction } from "./actions";
import { CopyMessageButton } from "./CopyMessageButton";
import { MarkAsSentButton } from "./MarkAsSentButton";
import { OpenWhatsAppButton } from "./OpenWhatsAppButton";
import { PrepareMessageButton } from "./PrepareMessageButton";

type Props = {
  leadId: string;
  initialPreparedMessage: string | null;
  phone: string | null;
  internationalPhone: string | null;
  canPrepare: boolean;
  prepareReason: string;
  canMarkSent: boolean;
  markSentReason: string;
};

function DraftTextarea({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      id="prepared-message-draft"
      className="reply-form-textarea message-workspace-draft-textarea"
      rows={4}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

export function PreparedMessageWorkspace({
  leadId,
  initialPreparedMessage,
  phone,
  internationalPhone,
  canPrepare,
  prepareReason,
  canMarkSent,
  markSentReason,
}: Props) {
  const router = useRouter();
  const saved = initialPreparedMessage ?? "";
  const [draft, setDraft] = useState(saved);
  const [savedBaseline, setSavedBaseline] = useState(saved);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(saved);
    setSavedBaseline(saved);
  }, [saved]);

  const isDirty = draft !== savedBaseline;
  const showEditor = saved.trim().length > 0;
  const hasDraftContent = draft.trim().length > 0;

  async function saveDraft() {
    setSaveFeedback(null);
    setSaveError(null);
    setIsSaving(true);
    try {
      const result = await updatePreparedMessageDraftAction(leadId, draft);
      if (result.ok) {
        setSavedBaseline(draft);
        setSaveFeedback("Saved");
        router.refresh();
        window.setTimeout(() => setSaveFeedback(null), 2500);
      } else {
        setSaveError(result.error);
      }
    } catch {
      setSaveError("Failed to save draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="message-workspace-actions">
        <div className="message-workspace-primary-actions">
          <PrepareMessageButton
            leadId={leadId}
            canPrepare={canPrepare}
            reason={prepareReason}
          />
          {hasDraftContent ? <CopyMessageButton text={draft} /> : null}
        </div>
        <div className="message-workspace-secondary-actions">
          <OpenWhatsAppButton
            phone={phone}
            internationalPhone={internationalPhone}
            preparedMessage={draft}
          />
          <MarkAsSentButton
            leadId={leadId}
            canMarkSent={canMarkSent}
            reason={markSentReason}
            hasUnsavedChanges={isDirty}
          />
        </div>
      </div>

      <div className="message-workspace-status">
        {hasDraftContent ? (
          <p className="message-wa-tip">
            After sending in WhatsApp, come back and click Mark sent.
          </p>
        ) : (
          <p className="empty">No prepared message yet</p>
        )}
      </div>

      {showEditor ? (
        <div className="message-workspace-draft">
          <label className="reply-form-label" htmlFor="prepared-message-draft">
            Prepared message
          </label>
          <DraftTextarea
            value={draft}
            onChange={setDraft}
            disabled={isSaving}
          />
          <div className="message-workspace-draft-meta">
            {isDirty ? (
              <span className="message-workspace-unsaved">Unsaved changes</span>
            ) : null}
            <button
              type="button"
              className="reply-form-submit message-workspace-save-draft"
              onClick={() => void saveDraft()}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            {saveFeedback ? (
              <span className="reply-form-saved">{saveFeedback}</span>
            ) : null}
            {saveError ? <span className="reply-form-error">{saveError}</span> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
