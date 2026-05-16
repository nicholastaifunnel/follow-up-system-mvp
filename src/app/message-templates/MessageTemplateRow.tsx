"use client";

import { useState, useTransition } from "react";
import {
  deleteMessageTemplatePresetAction,
  setActiveMessageTemplatePresetAction,
  updateMessageTemplatePresetAction,
} from "./actions";

type Props = {
  id: string;
  name: string;
  isActive: boolean;
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
  templates,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [bodies, setBodies] = useState(templates);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void updateMessageTemplatePresetAction(id, bodies).then((result) => {
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

  return (
    <section className="detail-card message-preset-card">
      <div className="message-preset-summary">
        <button
          type="button"
          className="message-preset-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide" : "Show"}
        </button>
        <h2>{name}</h2>
        {isActive ? <span className="message-template-status message-template-status--active">Active</span> : null}
        {!isActive ? (
          <button type="button" onClick={setActive} disabled={isPending}>
            Set Active
          </button>
        ) : null}
        <button
          type="button"
          className="message-preset-delete"
          onClick={remove}
          disabled={isPending}
        >
          Delete
        </button>
      </div>

      {expanded ? (
        <div className="message-preset-editor">
          {STAGES.map((stage) => (
            <label className="reply-form-label" key={stage}>
              {stage}
              <textarea
                className="reply-form-textarea message-template-body-textarea"
                rows={7}
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
          <div className="reply-sop-row-actions">
            <button type="button" className="reply-form-submit" onClick={save} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </button>
            {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
            {error ? <span className="reply-form-error">{error}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
