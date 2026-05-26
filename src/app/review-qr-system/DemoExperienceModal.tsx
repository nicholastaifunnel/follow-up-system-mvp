"use client";

import { useCallback, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  demoUrl: string;
};

export function DemoExperienceModal({
  open,
  onClose,
  demoUrl,
}: Props) {
  const openDemoPage = useCallback(() => {
    window.open(demoUrl, "_blank", "noopener,noreferrer");
  }, [demoUrl]);

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
      aria-labelledby="review-qr-demo-title"
    >
      <button
        type="button"
        className="review-qr-modal-backdrop"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="review-qr-modal-panel review-qr-demo-modal-panel">
        <button
          type="button"
          className="review-qr-modal-close"
          aria-label="关闭"
          onClick={onClose}
        >
          ×
        </button>

        <div className="review-qr-demo">
          <h2 id="review-qr-demo-title">先体验顾客评价流程</h2>
          <p className="review-qr-demo-sub">
            你可以先像真实顾客一样测试：
            选择平台、生成评价、复制内容，再到 Facebook / Google 提交。
          </p>

          <p className="review-qr-demo-hint">
            打开 Demo 后会在新页面进行测试。
            <br />
            测试完成后，回到这个页面继续了解免费试用。
          </p>

          <div className="review-qr-demo-actions">
            <button
              type="button"
              className="review-qr-cta review-qr-cta--wide review-qr-cta--demo-open"
              onClick={openDemoPage}
            >
              打开 Demo 页面
            </button>
          </div>

          <p className="review-qr-demo-note">
            这是测试 Demo，不会影响正式顾客资料。
          </p>
        </div>
      </div>
    </div>
  );
}
