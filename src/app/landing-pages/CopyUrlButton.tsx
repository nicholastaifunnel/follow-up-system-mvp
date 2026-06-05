"use client";

import { useState } from "react";

type Props = {
  path: string;
  label: string;
};

export function CopyUrlButton({ path, label }: Props) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="queue-limit-pill"
      disabled={pending}
      onClick={() => {
        const url = `${window.location.origin}${path}`;
        setPending(true);
        void navigator.clipboard
          .writeText(url)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {
            window.prompt("Copy this URL:", url);
          })
          .finally(() => setPending(false));
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
