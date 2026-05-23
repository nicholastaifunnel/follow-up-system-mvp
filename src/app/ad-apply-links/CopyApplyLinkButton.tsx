"use client";

import { useState } from "react";

type Props = {
  url: string;
};

export function CopyApplyLinkButton({ url }: Props) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="queue-limit-pill"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void navigator.clipboard
          .writeText(url)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {
            window.prompt("Copy this form link:", url);
          })
          .finally(() => setPending(false));
      }}
    >
      {copied ? "Copied" : "Copy form link"}
    </button>
  );
}
