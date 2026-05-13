"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { prepareLeadMessageAction } from "./actions";

type Props = {
  leadId: string;
  canPrepare: boolean;
  /** Shown when `canPrepare` is false (UI hint only). */
  reason: string;
};

export function PrepareMessageButton({ leadId, canPrepare, reason }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [language, setLanguage] = useState<"en" | "zh">("en");

  if (!canPrepare) {
    return (
      <p className="prepare-blocked">
        {reason || "This lead cannot be prepared from the current status."}
      </p>
    );
  }

  function onClick() {
    setError(null);
    setSuccess(false);
    startTransition(() => {
      void prepareLeadMessageAction(leadId, language).then((result) => {
        if (result.ok) {
          setSuccess(true);
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <div className="prepare-message-wrap">
      <select
        id={`prepare-language-${leadId}`}
        aria-label="Message language"
        value={language}
        onChange={(e) => setLanguage(e.target.value === "zh" ? "zh" : "en")}
        disabled={isPending}
      >
        <option value="en">English</option>
        <option value="zh">中文</option>
      </select>
      <button
        type="button"
        className="prepare-message-btn"
        onClick={onClick}
        disabled={isPending}
      >
        {isPending ? "Preparing..." : "Prepare Message"}
      </button>
      {error ? <p className="prepare-error">{error}</p> : null}
      {success ? <p className="prepare-success">Message prepared.</p> : null}
    </div>
  );
}
