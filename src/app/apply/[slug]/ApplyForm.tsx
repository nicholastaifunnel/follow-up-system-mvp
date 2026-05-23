"use client";

import { useState, useTransition } from "react";
import { submitApplyFormAction } from "./actions";

type Props = {
  slug: string;
};

export function ApplyForm({ slug }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="public-apply-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await submitApplyFormAction(slug, fd);
          if (result && "error" in result && !result.ok) {
            setError(result.error);
          }
        });
      }}
    >
      {error ? <p className="public-apply-error">{error}</p> : null}
      <label>
        联系人 *
        <input
          name="contactPerson"
          required
          autoComplete="name"
          placeholder="例如：Ah Mei / Jason"
        />
      </label>
      <label>
        WhatsApp 号码 *
        <input
          name="whatsappNumber"
          required
          type="tel"
          inputMode="tel"
          placeholder="例如：011-1327 3706"
          autoComplete="tel"
        />
      </label>
      <label>
        店名 *
        <input name="businessName" required placeholder="例如：ABC Beauty Studio" />
      </label>
      <label>
        Google Maps 店名 / 链接 *
        <input
          name="googleMapName"
          required
          placeholder="店名或 Google Maps link"
        />
      </label>
      <label>
        Facebook Page（可选）
        <input name="facebookPage" placeholder="有的话才填写" />
      </label>
      <button type="submit" className="public-apply-button" disabled={pending}>
        {pending
          ? "提交中… / Submitting…"
          : "提交免费试用申请 / Submit Free Trial Request"}
      </button>
      <p className="public-apply-footnote">
        提交后，请点击 WhatsApp 按钮联系我们完成确认。
        <span className="public-apply-footnote-en">
          After submitting, tap WhatsApp to confirm your setup.
        </span>
      </p>
    </form>
  );
}
