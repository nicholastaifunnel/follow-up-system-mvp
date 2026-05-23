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
        <span className="public-apply-field-hint">Ah Mei / Jason</span>
        <input name="contactPerson" required autoComplete="name" />
      </label>
      <label>
        WhatsApp 号码 *
        <span className="public-apply-field-hint">011-1327 3706</span>
        <input
          name="whatsappNumber"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
      </label>
      <label>
        店名 *
        <span className="public-apply-field-hint">ABC Beauty Studio</span>
        <input name="businessName" required />
      </label>
      <label>
        Google Maps 店名 / 链接 *
        <span className="public-apply-field-hint">店名或 Google Maps link</span>
        <input name="googleMapName" required />
      </label>
      <label>
        Facebook Page（可选）
        <span className="public-apply-field-hint">可选，可以不需要</span>
        <input name="facebookPage" />
      </label>
      <button type="submit" className="public-apply-button" disabled={pending}>
        {pending ? "提交中…" : "提交免费试用申请"}
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
