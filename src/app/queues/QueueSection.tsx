"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  totalCount: number;
  shownCount: number;
  defaultExpanded: boolean;
  children: ReactNode;
};

export function QueueSection({
  title,
  totalCount,
  shownCount,
  defaultExpanded,
  children,
}: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultExpanded);

  useEffect(() => {
    setOpen(defaultExpanded);
  }, [defaultExpanded]);

  return (
    <div className="queue-section">
      <button
        type="button"
        className="queue-section-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="queue-section-chevron" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
        <span className="queue-section-heading">{title}</span>
        <span className="queue-section-count">({totalCount})</span>
      </button>
      <p className="queue-section-meta">
        Count: {totalCount}
        {totalCount > shownCount ? (
          <>
            {" "}
            · Showing {shownCount}
          </>
        ) : null}
      </p>
      {open ? (
        <div id={panelId} className="queue-section-body">
          {children}
        </div>
      ) : null}
    </div>
  );
}
