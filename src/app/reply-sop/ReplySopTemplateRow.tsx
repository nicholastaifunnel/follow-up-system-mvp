"use client";

import { useEffect, useState, useTransition } from "react";
import { updateReplySopTemplateAction } from "./actions";

type Props = {
  id: string;
  typeLabel: string;
  body: string;
};

export function ReplySopTemplateRow({ id, typeLabel, body: initialBody }: Props) {
  const [body, setBody] = useState(initialBody);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setBody(initialBody);
  }, [initialBody]);

  function onSave() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void updateReplySopTemplateAction(id, body).then((result) => {
        if (result.ok) {
          setFeedback("Saved");
          window.setTimeout(() => setFeedback(null), 2500);
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <div className="detail-card reply-sop-card">
      <h3 className="reply-sop-type-title">{typeLabel}</h3>
      <label className="reply-form-label" htmlFor={`reply-sop-body-${id}`}>
        Body
      </label>
      <textarea
        id={`reply-sop-body-${id}`}
        className="reply-form-textarea reply-sop-body-textarea"
        rows={8}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={isPending}
      />
      <div className="reply-sop-row-actions">
        <button
          type="button"
          className="reply-form-submit"
          onClick={() => onSave()}
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
        {error ? <span className="reply-form-error">{error}</span> : null}
      </div>
    </div>
  );
}
