"use client";

import { useState, useTransition } from "react";
import { createMessageTemplatePresetAction } from "./actions";

export function CreateMessageTemplatePresetForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(() => {
      void createMessageTemplatePresetAction(name).then((result) => {
        if (result.ok) setName("");
        else setError(result.error);
      });
    });
  }

  return (
    <section className="detail-card message-preset-create">
      <label className="reply-form-label">
        Preset name
        <input
          className="reply-form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
        />
      </label>
      <button type="button" className="reply-form-submit" onClick={submit} disabled={isPending}>
        {isPending ? "Adding..." : "Add New Preset"}
      </button>
      {error ? <span className="reply-form-error">{error}</span> : null}
    </section>
  );
}
