"use client";

import { useCallback, useState } from "react";

type Props = {
  text: string;
};

export function CopyMessageButton({ text }: Props) {
  const [label, setLabel] = useState<"Copy Message" | "Copied!" | "Copy failed">(
    "Copy Message",
  );

  const onClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setLabel("Copied!");
      window.setTimeout(() => {
        setLabel("Copy Message");
      }, 2000);
    } catch {
      setLabel("Copy failed");
      window.setTimeout(() => {
        setLabel("Copy Message");
      }, 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      className="copy-message-btn"
      onClick={onClick}
      disabled={label !== "Copy Message"}
    >
      {label}
    </button>
  );
}
