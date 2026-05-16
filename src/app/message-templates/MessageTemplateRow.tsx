"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMessageTemplatePresetAction,
  duplicateMessageTemplatePresetAction,
  setActiveMessageTemplatePresetAction,
  updateMessageTemplatePresetAction,
} from "./actions";

type Props = {
  id: string;
  name: string;
  isActive: boolean;
  defaultExpanded: boolean;
  templates: Record<string, string>;
};

const STAGES = [
  "First Message",
  "First Follow Up",
  "Second Follow Up",
] as const;

export function MessageTemplateRow({
  id,
  name,
  isActive,
  defaultExpanded,
  templates,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [presetName, setPresetName] = useState(name);
  const [bodies, setBodies] = useState(templates);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void updateMessageTemplatePresetAction(id, presetName, bodies).then((result) => {
        if (result.ok) setFeedback("Saved");
        else setError(result.error);
      });
    });
  }

  function setActive() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void setActiveMessageTemplatePresetAction(id).then((result) => {
        if (result.ok) setFeedback("Active");
        else setError(result.error);
      });
    });
  }

  function remove() {
    if (!window.confirm("Delete this preset and its 3 messages?")) return;

    setFeedback(null);
    setError(null);
    startTransition(() => {
      void deleteMessageTemplatePresetAction(id).then((result) => {
        if (!result.ok) setError(result.error);
      });
    });
  }

  function duplicate() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void duplicateMessageTemplatePresetAction(id).then((result) => {
        if (result.ok) {
          setFeedback("Duplicated");
          if (result.presetId) {
            router.replace(`/message-templates?expanded=${result.presetId}`);
          }
        }
        else setError(result.error);
      });
    });
  }

  return (
    <section className="detail-card message-preset-card">
      <div className="message-preset-summary">
        <div className="message-preset-heading">
          <button
            type="button"
            className="message-preset-toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide" : "Show"}
          </button>
          <h2>{presetName}</h2>
          {isActive ? <span className="message-template-status message-template-status--active">Active</span> : null}
        </div>
        <div className="message-preset-actions">
          {!isActive ? (
            <button type="button" onClick={setActive} disabled={isPending}>
              Set Active
            </button>
          ) : null}
          <button type="button" onClick={duplicate} disabled={isPending}>
            Duplicate
          </button>
          <button
            type="button"
            className="message-preset-delete"
            onClick={remove}
            disabled={isPending}
          >
            Delete
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="message-preset-editor">
          <label className="reply-form-label message-preset-name-field">
            Preset name
            <input
              className="reply-form-input message-preset-name-input"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              disabled={isPending}
            />
          </label>
          {STAGES.map((stage) => (
            <label className="reply-form-label" key={stage}>
              {stage}
              <textarea
                className="reply-form-textarea message-template-body-textarea"
                rows={5}
                value={bodies[stage] ?? ""}
                onChange={(e) =>
                  setBodies((current) => ({
                    ...current,
                    [stage]: e.target.value,
                  }))
                }
                disabled={isPending}
              />
            </label>
          ))}
          <div className="message-preset-save-row">
            <div className="message-preset-save-status">
              {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
              {error ? <span className="reply-form-error">{error}</span> : null}
            </div>
            <button type="button" className="reply-form-submit message-preset-save" onClick={save} disabled={isPending}>
              {isPending ? "Saving..." : "Save Preset"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
