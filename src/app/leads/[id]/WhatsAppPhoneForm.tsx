"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateWhatsAppPhoneAction } from "./actions";

type Props = {
  leadId: string;
  initialWhatsAppPhone: string | null;
};

export function WhatsAppPhoneForm({ leadId, initialWhatsAppPhone }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialWhatsAppPhone ?? "");
  const [savedValue, setSavedValue] = useState(initialWhatsAppPhone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialWhatsAppPhone ?? "");
    setSavedValue(initialWhatsAppPhone ?? "");
  }, [initialWhatsAppPhone]);

  const isDirty = value.trim() !== savedValue.trim();

  async function save() {
    setFeedback(null);
    setError(null);
    setIsSaving(true);
    try {
      const result = await updateWhatsAppPhoneAction(leadId, value);
      if (result.ok) {
        const next = result.whatsappPhone ?? "";
        setValue(next);
        setSavedValue(next);
        setFeedback(next ? "Saved" : "Cleared");
        router.refresh();
        window.setTimeout(() => setFeedback(null), 2500);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to save WhatsApp phone. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="whatsapp-phone-form">
      <input
        className="phone-search-input whatsapp-phone-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 6012xxxxxxx"
        aria-label="WhatsApp Phone"
        disabled={isSaving}
      />
      <button
        type="button"
        className="phone-search-btn whatsapp-phone-save"
        onClick={() => void save()}
        disabled={isSaving || !isDirty}
      >
        {isSaving ? "Saving..." : "Save WhatsApp Phone"}
      </button>
      {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
      {error ? <span className="reply-form-error">{error}</span> : null}
    </div>
  );
}
