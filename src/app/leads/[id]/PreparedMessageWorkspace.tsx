"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkFollowUpSentButton } from "@/app/queues/MarkFollowUpSentButton";
import { updatePreparedMessageDraftAction } from "./actions";
import type { MessageWorkspaceMode } from "./messageWorkspaceState";
import { CopyMessageButton } from "./CopyMessageButton";
import { MarkAsSentButton } from "./MarkAsSentButton";
import { OpenWhatsAppButton } from "./OpenWhatsAppButton";
import { PrepareMessageButton } from "./PrepareMessageButton";

type Props = {
  leadId: string;
  initialPreparedMessage: string | null;
  phone: string | null;
  internationalPhone: string | null;
  whatsappPhone: string | null;
  workspaceMode: MessageWorkspaceMode;
  statusNote: string | null;
  canPrepare: boolean;
  prepareLabel: string;
  messageStage: string | null;
  canMarkSent: boolean;
  markSentReason: string;
  markFollowUpWhich: 1 | 2 | null;
  scheduledNote: string | null;
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
  whatsappPhone,
  workspaceMode,
  statusNote,
  canPrepare,
  prepareLabel,
  messageStage,
  canMarkSent,
  markSentReason,
  markFollowUpWhich,
  scheduledNote,
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
  const showEditor =
    saved.trim().length > 0 ||
    workspaceMode === "first-follow-up-scheduled" ||
    workspaceMode === "second-follow-up-scheduled";
  const hasDraftContent = draft.trim().length > 0;

  const showPrimaryActions =
    workspaceMode === "first-message" ||
    workspaceMode === "first-follow-up-due" ||
    workspaceMode === "second-follow-up-due";

  const showWhatsAppRow =
    showPrimaryActions ||
    workspaceMode === "first-follow-up-scheduled" ||
    workspaceMode === "second-follow-up-scheduled";

  const canEditDraft =
    workspaceMode === "first-message" ||
    workspaceMode === "first-follow-up-due" ||
    workspaceMode === "second-follow-up-due";

  const showMarkFirst =
    markFollowUpWhich === 1 && workspaceMode === "first-follow-up-due" && hasDraftContent;
  const showMarkSecond =
    markFollowUpWhich === 2 && workspaceMode === "second-follow-up-due" && hasDraftContent;

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

  if (
    workspaceMode === "replied-or-handoff" ||
    workspaceMode === "skipped" ||
    workspaceMode === "archived" ||
    workspaceMode === "blocked"
  ) {
    return (
      <>
        {statusNote ? <p className="prepare-blocked">{statusNote}</p> : null}
        {saved.trim().length > 0 ? (
          <div className="message-workspace-draft message-workspace-draft--readonly">
            <label className="reply-form-label">Last prepared message</label>
            <p className="message-workspace-readonly-preview">{saved}</p>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {scheduledNote ? (
        <p className="message-workspace-scheduled-note">{scheduledNote}</p>
      ) : null}

      {showPrimaryActions ? (
        <div className="message-workspace-actions">
          <div className="message-workspace-primary-actions">
            <PrepareMessageButton
              leadId={leadId}
              canPrepare={canPrepare}
              reason={statusNote ?? ""}
              label={prepareLabel}
              messageStage={messageStage ?? undefined}
            />
            {hasDraftContent ? <CopyMessageButton text={draft} /> : null}
          </div>
          {showWhatsAppRow ? (
            <div className="message-workspace-secondary-actions">
              <OpenWhatsAppButton
                phone={phone}
                internationalPhone={internationalPhone}
                whatsappPhone={whatsappPhone}
                preparedMessage={draft}
              />
              {workspaceMode === "first-message" ? (
                <MarkAsSentButton
                  leadId={leadId}
                  canMarkSent={canMarkSent}
                  reason={markSentReason}
                  hasUnsavedChanges={isDirty}
                />
              ) : null}
              {showMarkFirst ? (
                <MarkFollowUpSentButton leadId={leadId} which={1} />
              ) : null}
              {showMarkSecond ? (
                <MarkFollowUpSentButton leadId={leadId} which={2} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : showWhatsAppRow && hasDraftContent ? (
        <div className="message-workspace-actions">
          <div className="message-workspace-primary-actions">
            <CopyMessageButton text={draft} />
          </div>
          <div className="message-workspace-secondary-actions">
            <OpenWhatsAppButton
              phone={phone}
              internationalPhone={internationalPhone}
              whatsappPhone={whatsappPhone}
              preparedMessage={draft}
            />
          </div>
        </div>
      ) : null}

      <div className="message-workspace-status">
        {workspaceMode === "first-message" && hasDraftContent ? (
          <p className="message-wa-tip">
            After sending in WhatsApp, come back and click Mark sent.
          </p>
        ) : workspaceMode === "first-follow-up-due" && hasDraftContent ? (
          <p className="message-wa-tip">
            After sending in WhatsApp, click Mark first follow-up sent.
          </p>
        ) : workspaceMode === "second-follow-up-due" && hasDraftContent ? (
          <p className="message-wa-tip">
            After sending in WhatsApp, click Mark second follow-up sent.
          </p>
        ) : !showEditor ? (
          <p className="empty">No prepared message yet</p>
        ) : null}
      </div>

      {showEditor ? (
        <div className="message-workspace-draft">
          <label className="reply-form-label" htmlFor="prepared-message-draft">
            Prepared message
          </label>
          <DraftTextarea
            value={draft}
            onChange={setDraft}
            disabled={isSaving || !canEditDraft}
          />
          {canEditDraft ? (
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
          ) : null}
        </div>
      ) : null}
    </>
  );
}
