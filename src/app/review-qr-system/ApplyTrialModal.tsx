"use client";

import { useCallback, useEffect } from "react";
import { ApplyForm } from "@/app/apply/[slug]/ApplyForm";

const APPLY_SLUG = "beauty-1";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ApplyTrialModal({ open, onClose }: Props) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onKeyDown]);

  if (!open) return null;

  return (
    <div
      className="review-qr-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-qr-modal-title"
    >
      <button
        type="button"
        className="review-qr-modal-backdrop"
        aria-label="关闭"
        onClick={onClose}
      />
      <div
        className="review-qr-modal-panel"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="review-qr-modal-close"
          aria-label="关闭"
          onClick={onClose}
        >
          ×
        </button>
        <div className="public-apply-shell public-apply-shell--embed">
          <h2 id="review-qr-modal-title">申请免费试用</h2>
          <p className="public-apply-lead">
            填写资料后，我们会通过 WhatsApp 跟你确认设置。
          </p>
          <ApplyForm slug={APPLY_SLUG} showFootnote={false} />
        </div>
      </div>
    </div>
  );
}
